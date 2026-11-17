
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";

import { Throttle } from "@nestjs/throttler";

import type { Response } from "express";

import { AdminJwtGuard } from
  "../admin-auth/admin-jwt.guard.js";

import { AdminRolesGuard } from
  "../admin-auth/admin-roles.guard.js";

import { AdminRoles } from
  "../admin-auth/admin-roles.decorator.js";

import { WebAdsService } from "./web-ads.service.js";

import {
  CreatePlacementSchema,
  UpdatePlacementSchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
  ListSchema,
  DeliverySchema,
  ImpressionSchema,
  ReportSchema,
  IdSchema,
} from "./web-ads.schemas.js";

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from "../admin-auth/current-admin.decorator.js";
import type { AuthenticatedAdmin } from "../admin-auth/admin-auth.types.js";
import { PermanentDeleteService } from "../common/permanent-delete.service.js";

// ==========================================
// PROTECTED ADMIN API
// ==========================================

@Controller("admin/web-ads")
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles("SUPER_ADMIN", "ADMIN")
export class AdminWebAdsController {
  constructor(
    private readonly ads: WebAdsService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get("placements")
  listPlacements(@Query() query: unknown) {
    return this.ads.listPlacements(
      validate(ListSchema, query),
    );
  }

  @Post("placements")
  createPlacement(@Body() body: unknown) {
    return this.ads.createPlacement(
      validate(CreatePlacementSchema, body),
    );
  }

  @Patch("placements/:id")
  updatePlacement(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.ads.updatePlacement(
      validate(IdSchema, id),
      validate(UpdatePlacementSchema, body),
    );
  }

  @Delete("placements/:id")
  archivePlacement(
    @Param("id") rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(IdSchema, rawId);

    // ?permanent=true -> Super Admin hard delete (audit-logged)
    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, "WebAdPlacement", id, (tx) =>
        tx.webAdPlacement.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.ads.archivePlacement(id);
  }

  @Get("campaigns")
  listCampaigns(@Query() query: unknown) {
    return this.ads.listCampaigns(
      validate(ListSchema, query),
    );
  }

  @Get("campaigns/:id")
  getCampaign(@Param("id") id: string) {
    return this.ads.getCampaign(
      validate(IdSchema, id),
    );
  }

  @Post("campaigns")
  createCampaign(@Body() body: unknown) {
    return this.ads.createCampaign(
      validate(CreateCampaignSchema, body),
    );
  }

  @Patch("campaigns/:id")
  updateCampaign(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.ads.updateCampaign(
      validate(IdSchema, id),
      validate(UpdateCampaignSchema, body),
    );
  }

  @Delete("campaigns/:id")
  archiveCampaign(
    @Param("id") rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(IdSchema, rawId);

    // ?permanent=true -> Super Admin hard delete (audit-logged)
    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, "WebAdCampaign", id, (tx) =>
        tx.webAdCampaign.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.ads.archiveCampaign(id);
  }

  @Get("report")
  report(@Query() query: unknown) {
    return this.ads.report(
      validate(ReportSchema, query),
    );
  }
}

// ==========================================
// PUBLIC WEBSITE DELIVERY
// ==========================================

@Controller("web-ads")
export class PublicWebAdsController {
  constructor(
    private readonly ads: WebAdsService,
  ) {}

  @Get("delivery")
  @Header("Cache-Control", "no-store")
  @Throttle({
    short: { limit: 30, ttl: 60000 },
  })
  deliver(@Query() query: unknown) {
    return this.ads.deliver(
      validate(DeliverySchema, query),
    );
  }

  @Post("impression")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Throttle({
    short: { limit: 60, ttl: 60000 },
  })
  impression(@Body() body: unknown) {
    const input = validate(
      ImpressionSchema,
      body,
    );

    return this.ads.impression(input.token);
  }

  @Get("click/:token")
  @Header("Cache-Control", "no-store")
  @Throttle({
    short: { limit: 60, ttl: 60000 },
  })
  async click(
    @Param("token") token: string,
    @Res() response: Response,
  ) {
    if (
      token.length < 20 ||
      token.length > 2000
    ) {
      throw new BadRequestException(
        "Invalid click token",
      );
    }

    const destination = await this.ads.click(
      token,
    );

    response.setHeader(
      "Referrer-Policy",
      "no-referrer",
    );

    response.setHeader(
      "Cache-Control",
      "no-store",
    );

    return response.redirect(
      302,
      destination,
    );
  }
}
