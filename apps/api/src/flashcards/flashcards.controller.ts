
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';


import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { FlashcardsService } from
  './flashcards.service.js';

import {
  flashcardIdSchema,
  CreateDeckSchema,
  UpdateDeckSchema,
  AddDeckItemsSchema,
  DeckListQuerySchema,
  PaginationSchema,
} from './dto/flashcard.dto.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

// ==========================================
// PUBLIC FLASHCARD API
// ==========================================

@Controller('flashcards')
export class PublicFlashcardsController {
  constructor(
    private readonly service: FlashcardsService,
  ) {}

  @Get('decks')
  findDecks(@Query() query: unknown) {
    return this.service.findPublicDecks(
      validate(DeckListQuerySchema, query),
    );
  }

  @Get('decks/:id')
  findDeck(@Param('id') rawId: string) {
    return this.service.findPublicDeck(
      validate(flashcardIdSchema, rawId),
    );
  }

  @Get('decks/:id/items')
  findCards(
    @Param('id') rawId: string,
    @Query() query: unknown,
  ) {
    return this.service.findPublicCards(
      validate(flashcardIdSchema, rawId),
      validate(PaginationSchema, query),
    );
  }
}

// ==========================================
// ADMIN FLASHCARD MANAGEMENT
// ==========================================

@Controller('admin/flashcards')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class AdminFlashcardsController {
  constructor(
    private readonly service: FlashcardsService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get('decks')
  findDecks(@Query() query: unknown) {
    return this.service.findAdminDecks(
      validate(DeckListQuerySchema, query),
    );
  }

  @Get('decks/:id')
  findDeck(@Param('id') rawId: string) {
    return this.service.findAdminDeck(
      validate(flashcardIdSchema, rawId),
    );
  }

  @Post('decks')
  createDeck(@Body() body: unknown) {
    return this.service.createDeck(
      validate(CreateDeckSchema, body),
    );
  }

  @Patch('decks/:id')
  updateDeck(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateDeck(
      validate(flashcardIdSchema, rawId),
      validate(UpdateDeckSchema, body),
    );
  }

  @Delete('decks/:id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  unpublishDeck(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(flashcardIdSchema, rawId);

    // ?permanent=true -> Super Admin hard delete (audit-logged)
    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'FlashcardDeck', id, (tx) =>
        tx.flashcardDeck.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.service.unpublishDeck(id);
  }

  @Get('decks/:id/items')
  getDeckItems(
    @Param('id') rawId: string,
    @Query() query: unknown,
  ) {
    return this.service.getDeckItems(
      validate(flashcardIdSchema, rawId),
      validate(PaginationSchema, query),
    );
  }

  @Post('decks/:id/items')
  addDeckItems(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.service.addItemsToDeck(
      validate(flashcardIdSchema, rawId),
      validate(AddDeckItemsSchema, body),
    );
  }

  @Delete('decks/:id/items/:itemId')
  removeDeckItem(
    @Param('id') rawId: string,
    @Param('itemId') rawItemId: string,
  ) {
    return this.service.removeItemFromDeck(
      validate(flashcardIdSchema, rawId),
      validate(flashcardIdSchema, rawItemId),
    );
  }

  // ======================================
  // ADMIN: LEARNER PROGRESS
  // ======================================

  @Get('users/:userId/progress')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  getUserProgress(
    @Param('userId') rawUserId: string,
    @Query() query: unknown,
  ) {
    return this.service.getUserProgress(
      validate(flashcardIdSchema, rawUserId),
      validate(PaginationSchema, query),
    );
  }
}
