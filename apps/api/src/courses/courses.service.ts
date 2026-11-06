import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { 
  CreateCourseDto, UpdateCourseDto, 
  CreateModuleDto, UpdateModuleDto, 
  CreateLessonDto, UpdateLessonDto 
} from './dto/course.dto.js';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= COURSES =================
  async findAllCourses(appId?: string) {
    return this.prisma.course.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { modules: true } }
      }
    });
  }

  async createCourse(dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { appId_slug: { appId: dto.appId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException('A course with this slug already exists for this app.');

    return this.prisma.course.create({ data: dto });
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    if (dto.slug && dto.slug !== course.slug) {
      const existing = await this.prisma.course.findUnique({
        where: { appId_slug: { appId: course.appId, slug: dto.slug } },
      });
      if (existing) throw new ConflictException('Slug already in use for this app.');
    }

    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deleteCourse(id: string) {
    await this.prisma.course.delete({ where: { id } });
  }

  // ================= MODULES =================
  async findAllModules(courseId?: string) {
    return this.prisma.courseModule.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { lessons: true } }
      }
    });
  }

  async createModule(dto: CreateModuleDto) {
    const existing = await this.prisma.courseModule.findUnique({
      where: { courseId_slug: { courseId: dto.courseId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException('A module with this slug already exists in this course.');

    return this.prisma.courseModule.create({ data: dto });
  }

  async updateModule(id: string, dto: UpdateModuleDto) {
    const module = await this.prisma.courseModule.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');

    // Added Slug Conflict Check for Module
    if (dto.slug && dto.slug !== module.slug) {
      const existing = await this.prisma.courseModule.findUnique({
        where: { courseId_slug: { courseId: module.courseId, slug: dto.slug } },
      });
      if (existing) throw new ConflictException('Slug already in use for this course.');
    }

    return this.prisma.courseModule.update({ where: { id }, data: dto });
  }

  async deleteModule(id: string) {
    await this.prisma.courseModule.delete({ where: { id } });
  }

  // ================= LES সংক্ষিপ্ত =================
  async findAllLessons(moduleId?: string) {
    return this.prisma.lesson.findMany({
      where: moduleId ? { moduleId } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createLesson(dto: CreateLessonDto) {
    const existing = await this.prisma.lesson.findUnique({
      where: { moduleId_slug: { moduleId: dto.moduleId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException('A lesson with this slug already exists in this module.');

    return this.prisma.lesson.create({ data: dto });
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // Added Slug Conflict Check for Lesson
    if (dto.slug && dto.slug !== lesson.slug) {
      const existing = await this.prisma.lesson.findUnique({
        where: { moduleId_slug: { moduleId: lesson.moduleId, slug: dto.slug } },
      });
      if (existing) throw new ConflictException('Slug already in use for this module.');
    }

    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async deleteLesson(id: string) {
    await this.prisma.lesson.delete({ where: { id } });
  }
}