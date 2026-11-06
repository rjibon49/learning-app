import { Module } from '@nestjs/common';
import { FlashcardsController } from './flashcards.controller.js';
import { FlashcardsService } from './flashcards.service.js';
import { PrismaModule } from '../prisma.module.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
})
export class FlashcardsModule {}