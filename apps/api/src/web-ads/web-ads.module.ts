
import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma.module.js";

import { AdminAuthModule } from
  "../admin-auth/admin-auth.module.js";

import { WebAdsService } from "./web-ads.service.js";

import {
  AdminWebAdsController,
  PublicWebAdsController,
} from "./web-ads.controller.js";

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
  ],
  controllers: [
    AdminWebAdsController,
    PublicWebAdsController,
  ],
  providers: [WebAdsService],
  exports: [WebAdsService],
})
export class WebAdsModule {}
