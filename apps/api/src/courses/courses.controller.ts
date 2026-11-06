import {
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
import { CoursesService } from './courses.service.js';
import {
  CreateCourseSchema,
  CreateLessonSchema,
  CreateModuleSchema,
  UpdateCourseSchema,
  UpdateLessonSchema,
  UpdateModuleSchema,
} from './dto/course.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ================= COURSES =================
  @Get()
  async findAllCourses(@Query('appId') appId?: string) {
    return this.coursesService.findAllCourses(appId);
  }

  @Post()
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async createCourse(@Body() raw: unknown) {
    return this.coursesService.createCourse(CreateCourseSchema.parse(raw));
  }

  @Patch(':id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async updateCourse(@Param('id') id: string, @Body() raw: unknown) {
    return this.coursesService.updateCourse(id, UpdateCourseSchema.parse(raw));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteCourse(@Param('id') id: string) {
    await this.coursesService.deleteCourse(id);
  }

  // ================= MODULES =================
  @Get('modules')
  async findAllModules(@Query('courseId') courseId?: string) {
    return this.coursesService.findAllModules(courseId);
  }

  @Post('modules')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async createModule(@Body() raw: unknown) {
    return this.coursesService.createModule(CreateModuleSchema.parse(raw));
  }

  @Patch('modules/:id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async updateModule(@Param('id') id: string, @Body() raw: unknown) {
    return this.coursesService.updateModule(id, UpdateModuleSchema.parse(raw));
  }

  @Delete('modules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteModule(@Param('id') id: string) {
    await this.coursesService.deleteModule(id);
  }

  // ================= LESSONS =================
  @Get('lessons')
  async findAllLessons(@Query('moduleId') moduleId?: string) {
    return this.coursesService.findAllLessons(moduleId);
  }

  @Post('lessons')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async createLesson(@Body() raw: unknown) {
    return this.coursesService.createLesson(CreateLessonSchema.parse(raw));
  }

  @Patch('lessons/:id')
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async updateLesson(@Param('id') id: string, @Body() raw: unknown) {
    return this.coursesService.updateLesson(id, UpdateLessonSchema.parse(raw));
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteLesson(@Param('id') id: string) {
    await this.coursesService.deleteLesson(id);
  }
}