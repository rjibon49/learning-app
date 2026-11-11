
import { Injectable } from '@nestjs/common';
import {
  Prisma,
} from '../generated/prisma/client.js';

import { PrismaService } from '../prisma.service.js';
import type { AuditListInput } from './audit-logs.schemas.js';

type AuditEvent = {
  adminId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonObject;
};

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAllLogs(query: AuditListInput) {
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.adminId ? { adminId: query.adminId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType
        ? { entityType: query.entityType }
        : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(
        query.from || query.to
          ? {
              createdAt: {
                ...(query.from
                  ? { gte: new Date(query.from) }
                  : {}),
                ...(query.to
                  ? { lte: new Date(query.to) }
                  : {}),
              },
            }
          : {}
      ),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async record(event: AuditEvent) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId: event.adminId,
        action: event.action.slice(0, 100),
        entityType: event.entityType?.slice(0, 100),
        entityId: event.entityId?.slice(0, 191),
        ipAddress: event.ipAddress?.slice(0, 64),
        userAgent: event.userAgent?.slice(0, 500),
        ...(event.metadata
          ? { metadata: event.metadata }
          : {}),
      },
      select: { id: true },
    });
  }

  // Compatibility with existing AdminAuthService.
  async createLog(
    adminId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    return this.record({
      adminId,
      action,
      entityType,
      entityId,
      metadata,
    });
  }
}
