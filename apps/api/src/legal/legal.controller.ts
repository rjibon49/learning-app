import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';

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

  /** JSON for the apps: { title, company, updated, markdown }. */
  @Get('content/:doc')
  @Header('Cache-Control', 'public, max-age=300')
  content(@Param('doc') doc: string) {
    if (doc !== 'privacy' && doc !== 'terms') throw new NotFoundException();
    return this.legal.content(doc);
  }
}
