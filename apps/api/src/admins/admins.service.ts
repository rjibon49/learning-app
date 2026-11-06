import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import * as bcrypt from 'bcryptjs';
import type { CreateAdminDto, UpdateAdminDto } from './dto/admin.dto.js';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmins() {
    return this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Admin with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.adminUser.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    const data: any = {
      displayName: dto.displayName,
      role: dto.role,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      data.authVersion = { increment: 1 }; // Force re-login if password changes
    }

    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async deleteAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');
    await this.prisma.adminUser.delete({ where: { id } });
  }
}