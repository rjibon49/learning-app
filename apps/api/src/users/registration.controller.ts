
import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { RegistrationService } from './registration.service.js';
import {
  registerSchema,
  verifyEmailSchema,
} from './registration.schemas.js';

import { z } from "zod";

@Controller('auth')
export class RegistrationController {
  constructor(
    private readonly registration: RegistrationService,
  ) {}

  @Post('register')
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    medium: { limit: 5, ttl: 600000 },
    long: { limit: 10, ttl: 3600000 },
  })
  async register(@Body() body: unknown) {
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException(
        result.error.flatten(),
      );
    }

    return this.registration.register(result.data);
  }

  @Post('verify-email')
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    medium: { limit: 15, ttl: 600000 },
    long: { limit: 40, ttl: 3600000 },
  })
  async verifyEmail(@Body() body: unknown) {
    const result = verifyEmailSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException(
        result.error.flatten(),
      );
    }

    return this.registration.verifyEmail(result.data);
  }

@Post("resend-verification")
@Throttle({
  short: { limit: 3, ttl: 60000 },
  medium: { limit: 5, ttl: 600000 },
  long: { limit: 10, ttl: 3600000 },
})
async resendVerification(@Body() body: unknown) {
  const schema = z.strictObject({
    email: z.string().trim().toLowerCase().email().max(191),
  });

  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return this.registration.resendVerificationCode(
    result.data.email,
  );
}

}

