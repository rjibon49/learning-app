
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateConsentPolicyInput,
  UpdateConsentPolicyInput,
} from './admin-consent.schemas.js';

@Injectable()
export class AdminConsentService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // LIST POLICIES
  // ==========================================

  async list() {
    return this.prisma.consentPolicy.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        version: true,
        title: true,
        documentUrl: true,
        contentHash: true,
        isActive: true,
        effectiveAt: true,
        createdAt: true,
        _count: {
          select: {
            consents: true,
          },
        },
      },
    });
  }

  // ==========================================
  // FIND POLICY
  // ==========================================

  async findOne(id: string) {
    const policy =
      await this.prisma.consentPolicy.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              consents: true,
            },
          },
        },
      });

    if (!policy) {
      throw new NotFoundException(
        'Consent policy not found',
      );
    }

    return policy;
  }

  // ==========================================
  // CREATE DRAFT
  // ==========================================

  async create(input: CreateConsentPolicyInput) {
    const existing =
      await this.prisma.consentPolicy.findUnique({
        where: { version: input.version },
        select: { id: true },
      });

    if (existing) {
      throw new ConflictException(
        'Policy version already exists',
      );
    }

    return this.prisma.consentPolicy.create({
      data: {
        version: input.version,
        title: input.title,
        documentUrl: input.documentUrl,
        contentHash: input.contentHash,
        effectiveAt: input.effectiveAt
          ? new Date(input.effectiveAt)
          : null,
        isActive: false,
      },
    });
  }

  // ==========================================
  // UPDATE DRAFT
  // ==========================================

  async update(
    id: string,
    input: UpdateConsentPolicyInput,
  ) {
    const policy = await this.findOne(id);

    if (policy.isActive || policy._count.consents > 0) {
      throw new ConflictException(
        'A published or previously accepted policy cannot be edited. Create a new version.',
      );
    }

    const updated =
      await this.prisma.consentPolicy.updateMany({
        where: {
          id,
          isActive: false,
          consents: { none: {} },
        },
        data: {
          ...(input.title !== undefined
            ? { title: input.title }
            : {}),
          ...(input.documentUrl !== undefined
            ? { documentUrl: input.documentUrl }
            : {}),
          ...(input.contentHash !== undefined
            ? { contentHash: input.contentHash }
            : {}),
          ...(input.effectiveAt !== undefined
            ? {
                effectiveAt: new Date(
                  input.effectiveAt,
                ),
              }
            : {}),
        },
      });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Policy can no longer be edited',
      );
    }

    return this.findOne(id);
  }

  // ==========================================
  // ACTIVATE POLICY
  // ==========================================

  async activate(id: string) {
    const policy = await this.findOne(id);

    if (
      !policy.documentUrl ||
      !policy.contentHash
    ) {
      throw new BadRequestException(
        'Policy document and content hash are required',
      );
    }

    // Only one active policy is intended.
    // Previous versions remain stored.
    await this.prisma.$transaction(async (tx) => {
      await tx.consentPolicy.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      await tx.consentPolicy.update({
        where: { id },
        data: { isActive: true },
      });
    });

    return this.findOne(id);
  }

  // ==========================================
  // DEACTIVATE POLICY
  // ==========================================

  async deactivate(id: string) {
    await this.findOne(id);

    await this.prisma.consentPolicy.update({
      where: { id },
      data: { isActive: false },
    });

    return this.findOne(id);
  }
}
