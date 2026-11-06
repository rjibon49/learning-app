import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllLogs(limit = 50) {
    return this.prisma.adminAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { email: true, displayName: true, role: true },
        },
      },
    });
  }

  // Helper method to record logs across other modules
  async createLog(adminId: string, action: string, entityType?: string, entityId?: string, metadata?: any) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }
}