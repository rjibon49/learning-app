
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma.module.js';

import {
  LearnerAuthModule,
} from '../learner-auth/learner-auth.module.js';

import {
  AdminAuthModule,
} from '../admin-auth/admin-auth.module.js';

import {
  ConsentPolicyController,
} from './consent-policy.controller.js';

import {
  ConsentPolicyService,
} from './consent-policy.service.js';

import {
  MarketingPreferencesController,
} from './marketing-preferences.controller.js';

import {
  MarketingPreferencesService,
} from './marketing-preferences.service.js';

import {
  AdminConsentController,
} from './admin-consent.controller.js';

import {
  AdminConsentService,
} from './admin-consent.service.js';

@Module({
  imports: [
    PrismaModule,
    LearnerAuthModule,
    AdminAuthModule,
  ],

  controllers: [
    ConsentPolicyController,
    MarketingPreferencesController,
    AdminConsentController,
  ],

  providers: [
    ConsentPolicyService,
    MarketingPreferencesService,
    AdminConsentService,
  ],

  exports: [
    ConsentPolicyService,
    MarketingPreferencesService,
    AdminConsentService,
  ],
})
export class ConsentModule {}
