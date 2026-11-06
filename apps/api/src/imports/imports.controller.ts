import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ImportsService } from './imports.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import { z } from 'zod';

const ImportVocabularySchema = z.object({
  appId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  items: z.array(
    z.object({
      german: z.string().min(1),
      english: z.string().min(1),
      bangla: z.string().min(1),
      article: z.string().optional().nullable(),
      pluralGerman: z.string().optional().nullable(),
      pronunciationBangla: z.string().optional().nullable(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('EASY'),
    })
  ).min(1, 'No valid items found to import'),
});

@Controller('imports')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('vocabulary')
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async importVocabulary(@Body() body: unknown) {
    try {
      const parsedData = ImportVocabularySchema.parse(body);
      return await this.importsService.importVocabulary(parsedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({ message: 'Validation failed', errors: error.issues });
      }
      throw error;
    }
  }
}