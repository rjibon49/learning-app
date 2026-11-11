
import {
  Global,
  Module,
} from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';

import { AdminJwtGuard } from './admin-jwt.guard.js';
import { AdminRolesGuard } from './admin-roles.guard.js';

@Module({
  imports: [
    JwtModule.register({}),
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
    JwtModule,
    AdminAuthService,
    AdminJwtGuard,
    AdminRolesGuard,
  ],
})
@Global()
export class AdminAuthModule {}
