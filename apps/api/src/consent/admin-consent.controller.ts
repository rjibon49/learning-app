
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

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

function validate<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

@Controller('admin/consent/policies')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
export class AdminConsentController {
  constructor(
    private readonly policies:
      AdminConsentService,
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
}
