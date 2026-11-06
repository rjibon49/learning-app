import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service.js';
import { CreateDeckSchema, UpdateDeckSchema, AddDeckItemsSchema } from './dto/flashcard.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';

@Controller('flashcards')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get('decks')
  async findAllDecks(@Query('appId') appId?: string) {
    return this.flashcardsService.findAllDecks(appId);
  }

  @Post('decks')
  async createDeck(@Body() raw: unknown) {
    return this.flashcardsService.createDeck(CreateDeckSchema.parse(raw));
  }

  @Patch('decks/:id')
  async updateDeck(@Param('id') id: string, @Body() raw: unknown) {
    return this.flashcardsService.updateDeck(id, UpdateDeckSchema.parse(raw));
  }

  @Delete('decks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDeck(@Param('id') id: string) {
    await this.flashcardsService.deleteDeck(id);
  }

  @Get('decks/:deckId/items')
  async getDeckItems(@Param('deckId') deckId: string) {
    return this.flashcardsService.getDeckItems(deckId);
  }

  @Post('decks/:deckId/items')
  async addDeckItems(@Param('deckId') deckId: string, @Body() raw: unknown) {
    const { vocabularyIds } = AddDeckItemsSchema.parse(raw);
    return this.flashcardsService.addItemsToDeck(deckId, vocabularyIds);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(@Param('itemId') itemId: string) {
    await this.flashcardsService.removeItemFromDeck(itemId);
  }
}