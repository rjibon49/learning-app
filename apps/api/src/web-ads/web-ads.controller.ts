
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
import { z } from "zod";

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

// ==========================================
// PROTECTED ADMIN API
// ==========================================

@Controller("admin/web-ads")
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles("SUPER_ADMIN", "ADMIN")
export class AdminWebAdsController {
  constructor(
    private readonly ads: WebAdsService,
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
    @Param("id") id: string,
  ) {
    return this.ads.archivePlacement(
      validate(IdSchema, id),
    );
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
  archiveCampaign(@Param("id") id: string) {
    return this.ads.archiveCampaign(
      validate(IdSchema, id),
    );
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
