import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { privacyPage, termsPage } from './legal.pages.js';

/** Public legal pages: /api/legal/privacy and /api/legal/terms. */
@Controller('legal')
export class LegalController {
  constructor(private readonly config: ConfigService) {}

  private contact() {
    return this.config.get<string>('LEGAL_CONTACT_EMAIL') || 'rjibon49@gmail.com';
  }

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  privacy() {
    return privacyPage(this.contact());
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  terms() {
    return termsPage(this.contact());
  }
}
