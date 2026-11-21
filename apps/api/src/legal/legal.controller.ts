import { Controller, Get, Header } from '@nestjs/common';

import { LegalService } from './legal.service.js';

/** Public legal pages: /api/legal/privacy and /api/legal/terms (edited in the CMS). */
@Controller('legal')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  privacy() {
    return this.legal.privacyHtml();
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  terms() {
    return this.legal.termsHtml();
  }
}
