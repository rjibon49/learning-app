import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async importVocabulary(data: { appId: string; categoryId?: string | null; items: any[] }) {
    const { appId, categoryId, items } = data;

    // Mapping items to match Prisma Schema
    const mappedItems = items.map((item) => ({
      appId,
      categoryId: categoryId || null,
      german: item.german.trim(),
      english: item.english.trim(),
      bangla: item.bangla.trim(),
      article: item.article?.trim() || null,
      pluralGerman: item.pluralGerman?.trim() || null,
      pronunciationBangla: item.pronunciationBangla?.trim() || null,
      difficulty: (item.difficulty || 'EASY') as any, // <-- এখানে Type casting করা হলো
      isPublished: true,
      status: 'PUBLISHED' as any, // <-- এখানে Type casting করা হলো
    }));

    // Bulk Insert
    const result = await this.prisma.vocabulary.createMany({
      data: mappedItems,
      skipDuplicates: true,
    });

    return { 
      success: true, 
      importedCount: result.count 
    };
  }
}