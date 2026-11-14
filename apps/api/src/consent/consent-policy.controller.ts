
import {
  Controller,
  Get,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { ConsentPolicyService } from './consent-policy.service.js';

@Controller('consent')
export class ConsentPolicyController {
  constructor(
    private readonly policies: ConsentPolicyService,
  ) {}

  @Get('active-policy')
  @Throttle({
    short: { limit: 20, ttl: 60000 },
    medium: { limit: 60, ttl: 600000 },
    long: { limit: 200, ttl: 3600000 },
  })
  getActivePolicy() {
    return this.policies.getActivePolicy();
  }
}
