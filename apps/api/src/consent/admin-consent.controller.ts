
import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import {
  AdminJwtGuard,
} from '../admin-auth/admin-jwt.guard.js';

import {
  AdminRolesGuard,
} from '../admin-auth/admin-roles.guard.js';

import {
  AdminRoles,
} from '../admin-auth/admin-roles.decorator.js';

import {
  AdminConsentService,
} from './admin-consent.service.js';

import {
  createConsentPolicySchema,
  updateConsentPolicySchema,
  consentPolicyParamsSchema,
} from './admin-consent.schemas.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

@Controller('admin/consent/policies')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AdminConsentController {
  constructor(
    private readonly policies:
      AdminConsentService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get()
  list() {
    return this.policies.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const params = validate(
      consentPolicyParamsSchema,
      { id },
    );

    return this.policies.findOne(params.id);
  }

  @Post()
  @Throttle({
    short: { limit: 5, ttl: 60000 },
  })
  create(@Body() body: unknown) {
    return this.policies.create(
      validate(createConsentPolicySchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const params = validate(
      consentPolicyParamsSchema,
      { id },
    );

    return this.policies.update(
      params.id,
      validate(updateConsentPolicySchema, body),
    );
  }

  @Post(':id/activate')
  @AdminRoles('SUPER_ADMIN')
  @Throttle({
    short: { limit: 3, ttl: 60000 },
  })
  activate(@Param('id') id: string) {
    const params = validate(
      consentPolicyParamsSchema,
      { id },
    );

    return this.policies.activate(params.id);
  }

  @Post(':id/deactivate')
  @AdminRoles('SUPER_ADMIN')
  deactivate(@Param('id') id: string) {
    const params = validate(
      consentPolicyParamsSchema,
      { id },
    );

    return this.policies.deactivate(params.id);
  }


  /**
   * DELETE /admin/consent/policies/:id                -> deactivate
   * DELETE /admin/consent/policies/:id?permanent=true -> SUPER_ADMIN: delete only
   *   if no learner has accepted it (consent records are legal evidence).
   */
  @Delete(':id')
  @AdminRoles('SUPER_ADMIN')
  remove(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const { id } = validate(consentPolicyParamsSchema, { id: rawId });

    if (!isPermanent(query)) {
      return this.policies.deactivate(id);
    }

    return this.permanentDelete.run(admin, 'ConsentPolicy', id, async (tx) => {
      const accepted = await tx.marketingConsent.count({
        where: { policyId: id },
      });

      if (accepted > 0) {
        throw new ConflictException(
          'Learners have accepted this policy. Deactivate it instead of deleting.',
        );
      }

      await tx.consentPolicy.delete({ where: { id }, select: { id: true } });
    });
  }
}
