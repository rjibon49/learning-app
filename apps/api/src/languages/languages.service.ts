
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateLanguageInput,
  UpdateLanguageInput,
  AssignLevelsInput,
} from './languages.schemas.js';

@Injectable()
export class LanguagesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ======================================
  // PUBLIC: Active languages
  // ======================================

  findAll() {
    return this.prisma.language.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        nativeName: true,
        direction: true,
        sortOrder: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  // ======================================
  // PUBLIC: Levels available for a language
  // ======================================

  async findLevels(code: string) {
    const language =
      await this.prisma.language.findUnique({
        where: { code },
        include: {
          availableLevels: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              level: {
                include: {
                  framework: true,
                },
              },
            },
          },
        },
      });

    if (!language || !language.isActive) {
      throw new NotFoundException(
        'Language not found',
      );
    }

    return {
      language: {
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
        direction: language.direction,
      },
      levels: language.availableLevels.map(
        (assignment) => ({
          id: assignment.level.id,
          code: assignment.level.code,
          name: assignment.level.name,
          description: assignment.level.description,
          framework: {
            code: assignment.level.framework.code,
            name: assignment.level.framework.name,
          },
          sortOrder: assignment.sortOrder,
        }),
      ),
    };
  }

  // ======================================
  // ADMIN: All languages
  // ======================================

  findAllAdmin() {
    return this.prisma.language.findMany({
      include: {
        _count: {
          select: {
            apps: true,
            courses: true,
            vocabularies: true,
            availableLevels: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  // ======================================
  // ADMIN: Available frameworks
  // ======================================

  findFrameworks() {
    return this.prisma.proficiencyFramework.findMany({
      where: {
        isActive: true,
      },
      include: {
        levels: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  // ======================================
  // ADMIN: Create language
  // ======================================

  async create(input: CreateLanguageInput) {
    const existing =
      await this.prisma.language.findUnique({
        where: { code: input.code },
      });

    if (existing) {
      throw new ConflictException(
        'Language already exists',
      );
    }

    try {
      return await this.prisma.language.create({
        data: input,
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Language already exists',
        );
      }

      throw error;
    }
  }

  // ======================================
  // ADMIN: Update language
  // ======================================

  async update(
    code: string,
    input: UpdateLanguageInput,
  ) {
    const existing =
      await this.prisma.language.findUnique({
        where: { code },
      });

    if (!existing) {
      throw new NotFoundException(
        'Language not found',
      );
    }

    return this.prisma.language.update({
      where: { code },
      data: input,
    });
  }

  // ======================================
  // ADMIN: Assign proficiency levels
  // ======================================

  async assignLevels(
    code: string,
    input: AssignLevelsInput,
  ) {
    const language =
      await this.prisma.language.findUnique({
        where: { code },
      });

    if (!language) {
      throw new NotFoundException(
        'Language not found',
      );
    }

    const framework =
      await this.prisma.proficiencyFramework.findUnique({
        where: {
          code: input.frameworkCode,
        },
        include: {
          levels: true,
        },
      });

    if (!framework || !framework.isActive) {
      throw new NotFoundException(
        'Proficiency framework not found',
      );
    }

    const requestedLevels = input.levelCodes.map(
      (levelCode) =>
        framework.levels.find(
          (level) => level.code === levelCode,
        ),
    );

    if (requestedLevels.some((level) => !level)) {
      throw new BadRequestException(
        'One or more proficiency levels are invalid',
      );
    }

    const levelIds = requestedLevels.map(
      (level) => level!.id,
    );

    // Preserve existing language-level records.
    // Other framework assignments are not removed.
    await this.prisma.$transaction(async (tx) => {
      for (const [
        index,
        levelId,
      ] of levelIds.entries()) {
        await tx.languageProficiencyLevel.upsert({
          where: {
            languageId_levelId: {
              languageId: language.id,
              levelId,
            },
          },
          create: {
            languageId: language.id,
            levelId,
            sortOrder: index,
            isActive: true,
          },
          update: {
            sortOrder: index,
            isActive: true,
          },
        });
      }
    });

    return this.findLevelsAdmin(code);
  }

  // ======================================
  // ADMIN: View complete language setup
  // ======================================

  async findLevelsAdmin(code: string) {
    const language =
      await this.prisma.language.findUnique({
        where: { code },
        include: {
          availableLevels: {
            include: {
              level: {
                include: {
                  framework: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

    if (!language) {
      throw new NotFoundException(
        'Language not found',
      );
    }

    return language;
  }
}
