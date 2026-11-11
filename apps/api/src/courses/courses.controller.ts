
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { z } from 'zod';

import { CoursesService } from './courses.service.js';

import {
  idSchema,
  CreateCourseSchema,
  UpdateCourseSchema,
  AssignCourseAppsSchema,
  CreateModuleSchema,
  UpdateModuleSchema,
  CreateLessonSchema,
  UpdateLessonSchema,
  UpsertLessonTranslationSchema,
  CreateLessonResourceSchema,
  UpdateLessonResourceSchema,
  courseQuerySchema,
  moduleQuerySchema,
  lessonQuerySchema,
} from './dto/course.dto.js';

import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

function validate<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

// ========================================
// PUBLIC COURSE API
// ========================================

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.courses.findAllCourses(
      validate(courseQuerySchema, query),
    );
  }

  // Keep legacy public module route
  @Get('modules')
  findModules(@Query() query: unknown) {
    const data = validate(
      moduleQuerySchema,
      query,
    );

    return this.courses.findAllModules(
      data.courseId,
    );
  }

  // Keep legacy public lesson route
  @Get('lessons')
  findLessons(@Query() query: unknown) {
    const data = validate(
      lessonQuerySchema,
      query,
    );

    return this.courses.findAllLessons(
      data.moduleId,
    );
  }

  @Get('lessons/:id')
  findLesson(@Param('id') rawId: string) {
    return this.courses.findPublishedLesson(
      validate(idSchema, rawId),
    );
  }

  @Get(':id')
  findCourse(@Param('id') rawId: string) {
    return this.courses.findPublishedCourse(
      validate(idSchema, rawId),
    );
  }
}

// ========================================
// PROTECTED ADMIN COURSE API
// ========================================

@Controller('admin/courses')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class AdminCoursesController {
  constructor(
    private readonly courses: CoursesService,
  ) {}

  // ======================================
  // COURSES
  // ======================================

  @Get()
  findAll(@Query() query: unknown) {
    return this.courses.findAllCoursesAdmin(
      validate(courseQuerySchema, query),
    );
  }

  @Get('modules')
  findModules(@Query() query: unknown) {
    const data = validate(
      moduleQuerySchema,
      query,
    );

    return this.courses.findAllModulesAdmin(
      data.courseId,
    );
  }

  @Get('lessons')
  findLessons(@Query() query: unknown) {
    const data = validate(
      lessonQuerySchema,
      query,
    );

    return this.courses.findAllLessonsAdmin(
      data.moduleId,
    );
  }

  @Get('lessons/:id')
  findLesson(@Param('id') rawId: string) {
    return this.courses.findLessonAdmin(
      validate(idSchema, rawId),
    );
  }

  @Get(':id')
  findCourse(@Param('id') rawId: string) {
    return this.courses.findCourseAdmin(
      validate(idSchema, rawId),
    );
  }

  @Post()
  createCourse(@Body() body: unknown) {
    return this.courses.createCourse(
      validate(CreateCourseSchema, body),
    );
  }

  @Patch(':id')
  updateCourse(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.courses.updateCourse(
      validate(idSchema, rawId),
      validate(UpdateCourseSchema, body),
    );
  }

  @Delete(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  archiveCourse(@Param('id') rawId: string) {
    return this.courses.archiveCourse(
      validate(idSchema, rawId),
    );
  }

  @Post(':id/apps')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  assignApps(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.courses.assignApps(
      validate(idSchema, rawId),
      validate(AssignCourseAppsSchema, body),
    );
  }

  // ======================================
  // MODULES
  // ======================================

  @Post('modules')
  createModule(@Body() body: unknown) {
    return this.courses.createModule(
      validate(CreateModuleSchema, body),
    );
  }

  @Patch('modules/:id')
  updateModule(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.courses.updateModule(
      validate(idSchema, rawId),
      validate(UpdateModuleSchema, body),
    );
  }

  @Delete('modules/:id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  archiveModule(@Param('id') rawId: string) {
    return this.courses.archiveModule(
      validate(idSchema, rawId),
    );
  }

  // ======================================
  // LESSONS
  // ======================================

  @Post('lessons')
  createLesson(@Body() body: unknown) {
    return this.courses.createLesson(
      validate(CreateLessonSchema, body),
    );
  }

  @Patch('lessons/:id')
  updateLesson(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.courses.updateLesson(
      validate(idSchema, rawId),
      validate(UpdateLessonSchema, body),
    );
  }

  @Delete('lessons/:id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  archiveLesson(@Param('id') rawId: string) {
    return this.courses.archiveLesson(
      validate(idSchema, rawId),
    );
  }

  // ======================================
  // LESSON TRANSLATIONS
  // ======================================

  @Post('lessons/:id/translations')
  saveTranslation(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.courses.upsertLessonTranslation(
      validate(idSchema, rawId),
      validate(
        UpsertLessonTranslationSchema,
        body,
      ),
    );
  }

  @Delete('lessons/:id/translations/:languageId')
  @HttpCode(HttpStatus.OK)
  removeTranslation(
    @Param('id') rawId: string,
    @Param('languageId') rawLanguageId: string,
  ) {
    return this.courses.removeLessonTranslation(
      validate(idSchema, rawId),
      validate(idSchema, rawLanguageId),
    );
  }

  // ======================================
  // LESSON MEDIA / RESOURCES
  // ======================================

  @Post('lessons/:id/resources')
  attachResource(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.courses.attachResource(
      validate(idSchema, rawId),
      validate(CreateLessonResourceSchema, body),
    );
  }

  @Patch('lessons/:id/resources/:resourceId')
  updateResource(
    @Param('id') rawId: string,
    @Param('resourceId') rawResourceId: string,
    @Body() body: unknown,
  ) {
    return this.courses.updateResource(
      validate(idSchema, rawId),
      validate(idSchema, rawResourceId),
      validate(UpdateLessonResourceSchema, body),
    );
  }

  @Delete('lessons/:id/resources/:resourceId')
  removeResource(
    @Param('id') rawId: string,
    @Param('resourceId') rawResourceId: string,
  ) {
    return this.courses.removeResource(
      validate(idSchema, rawId),
      validate(idSchema, rawResourceId),
    );
  }
}
