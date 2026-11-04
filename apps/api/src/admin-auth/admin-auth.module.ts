import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtGuard } from './admin-jwt.guard.js';
import { AdminRolesGuard } from './admin-roles.guard.js';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],

  controllers: [
    AdminAuthController,
  ],

  providers: [
    AdminAuthService,
    AdminJwtGuard,
    AdminRolesGuard,
  ],

  exports: [
    AdminAuthService,
    AdminJwtGuard,
    AdminRolesGuard,
  ],
})
export class AdminAuthModule {}