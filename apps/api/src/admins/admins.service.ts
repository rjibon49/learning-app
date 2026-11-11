
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import {
  Prisma,
  type AdminRole,
} from '../generated/prisma/client.js';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateAdminDto,
  UpdateAdminDto,
  AdminListDto,
} from './dto/admin.dto.js';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly selectFields = {
    id: true,
    email: true,
    displayName: true,
    role: true,
    isActive: true,
    authVersion: true,
    lastLoginAt: true,
    passwordChangedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async findAllAdmins(query: AdminListDto) {
    const where: Prisma.AdminUserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive
        ? { isActive: query.isActive === 'true' }
        : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { displayName: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminUser.findMany({
        where,
        select: this.selectFields,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.adminUser.count({ where }),
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

  async createAdmin(
    actorId: string,
    dto: CreateAdminDto,
  ) {
    const passwordHash = await argon2.hash(
      dto.password,
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const admin = await tx.adminUser.create({
          data: {
            email: dto.email,
            displayName: dto.displayName,
            passwordHash,
            role: dto.role,
            isActive: true,
            passwordChangedAt: new Date(),
          },
          select: this.selectFields,
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: 'ADMIN_CREATED',
            entityType: 'AdminUser',
            entityId: admin.id,
            metadata: {
              role: admin.role,
            },
          },
        });

        return admin;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An administrator with this email already exists',
        );
      }
      throw error;
    }
  }

  async updateAdmin(
    actorId: string,
    id: string,
    dto: UpdateAdminDto,
  ) {
    const passwordHash = dto.password
      ? await argon2.hash(dto.password, {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        })
      : undefined;

    return this.prisma.$transaction(
      async (tx) => {
        const admin = await tx.adminUser.findUnique({
          where: { id },
        });

        if (!admin) {
          throw new NotFoundException('Admin not found');
        }

        if (
          actorId === id &&
          (
            dto.isActive === false ||
            (dto.role !== undefined &&
             dto.role !== 'SUPER_ADMIN')
          )
        ) {
          throw new ForbiddenException(
            'You cannot deactivate or demote your own Super Admin account',
          );
        }

        const removingSuperAdmin =
          admin.role === 'SUPER_ADMIN' &&
          admin.isActive &&
          (
            dto.isActive === false ||
            (
              dto.role !== undefined &&
              dto.role !== 'SUPER_ADMIN'
            )
          );

        if (removingSuperAdmin) {
          const count = await tx.adminUser.count({
            where: {
              role: 'SUPER_ADMIN',
              isActive: true,
            },
          });

          if (count <= 1) {
            throw new ConflictException(
              'The last active Super Admin must be preserved',
            );
          }
        }

        const securityChanged =
          Boolean(passwordHash) ||
          (
            dto.role !== undefined &&
            dto.role !== admin.role
          ) ||
          dto.isActive === false;

        const data: Prisma.AdminUserUncheckedUpdateInput = {};

        if (dto.displayName !== undefined) {
          data.displayName = dto.displayName;
        }

        if (dto.role !== undefined) {
          data.role = dto.role as AdminRole;
        }

        if (dto.isActive !== undefined) {
          data.isActive = dto.isActive;
        }

        if (passwordHash) {
          data.passwordHash = passwordHash;
          data.passwordChangedAt = new Date();
        }

        if (securityChanged) {
          data.authVersion = { increment: 1 };
        }

        const updated = await tx.adminUser.update({
          where: { id },
          data,
          select: this.selectFields,
        });

        if (securityChanged) {
          await tx.adminRefreshToken.updateMany({
            where: {
              adminId: id,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }

        await tx.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: 'ADMIN_UPDATED',
            entityType: 'AdminUser',
            entityId: id,
            metadata: {
              oldRole: admin.role,
              newRole: updated.role,
              oldActive: admin.isActive,
              newActive: updated.isActive,
              passwordChanged: Boolean(passwordHash),
              sessionsRevoked: securityChanged,
            },
          },
        });

        return updated;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }

  async deactivateAdmin(
    actorId: string,
    id: string,
  ) {
    if (actorId === id) {
      throw new ForbiddenException(
        'You cannot deactivate yourself',
      );
    }

    await this.updateAdmin(actorId, id, {
      isActive: false,
    });

    return { success: true };
  }
}
