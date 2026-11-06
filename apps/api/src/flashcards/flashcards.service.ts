import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { CreateDeckDto, UpdateDeckDto } from './dto/flashcard.dto.js';

@Injectable()
export class FlashcardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllDecks(appId?: string) {
    return this.prisma.flashcardDeck.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  async createDeck(dto: CreateDeckDto) {
    return this.prisma.flashcardDeck.create({ data: dto as any });
  }

  async updateDeck(id: string, dto: UpdateDeckDto) {
    const deck = await this.prisma.flashcardDeck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Deck not found');
    return this.prisma.flashcardDeck.update({ where: { id }, data: dto as any });
  }

  async deleteDeck(id: string) {
    await this.prisma.flashcardDeck.delete({ where: { id } });
  }

  // Deck Items (Vocabulary mapping)
  async getDeckItems(deckId: string) {
    return this.prisma.flashcardDeckItem.findMany({
      where: { deckId },
      include: {
        vocabulary: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addItemsToDeck(deckId: string, vocabularyIds: string[]) {
    const existingItems = await this.prisma.flashcardDeckItem.findMany({
      where: { deckId },
    });
    let nextSortOrder = existingItems.length;

    const data = vocabularyIds.map((vocabularyId) => ({
      deckId,
      vocabularyId,
      sortOrder: ++nextSortOrder,
    }));

    // skipDuplicates ensures we don't insert the same word twice in a deck
    await this.prisma.flashcardDeckItem.createMany({
      data,
      skipDuplicates: true,
    });

    return this.getDeckItems(deckId);
  }

  async removeItemFromDeck(itemId: string) {
    await this.prisma.flashcardDeckItem.delete({ where: { id: itemId } });
  }
}