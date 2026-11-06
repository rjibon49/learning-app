import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { QuizzesService } from './quizzes.service.js';
import { CreateQuizSchema, UpdateQuizSchema, CreateQuestionSchema, UpdateQuestionSchema } from './dto/quiz.dto.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';

@Controller('quizzes')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // --- QUIZ ROUTES ---
  @Get()
  async findAll(@Query('appId') appId?: string) {
    return this.quizzesService.findAllQuizzes(appId);
  }

  @Post()
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async createQuiz(@Body() raw: unknown) {
    return this.quizzesService.createQuiz(CreateQuizSchema.parse(raw));
  }

  @Patch(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async updateQuiz(@Param('id') id: string, @Body() raw: unknown) {
    return this.quizzesService.updateQuiz(id, UpdateQuizSchema.parse(raw));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteQuiz(@Param('id') id: string) {
    await this.quizzesService.deleteQuiz(id);
  }

  // --- QUESTION ROUTES ---
  @Get(':quizId/questions')
  async getQuestions(@Param('quizId') quizId: string) {
    return this.quizzesService.getQuizQuestions(quizId);
  }

  @Post('questions')
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async createQuestion(@Body() raw: unknown) {
    return this.quizzesService.createQuestion(CreateQuestionSchema.parse(raw));
  }

  @Patch('questions/:id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async updateQuestion(@Param('id') id: string, @Body() raw: unknown) {
    return this.quizzesService.updateQuestion(id, UpdateQuestionSchema.parse(raw));
  }

  @Delete('questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteQuestion(@Param('id') id: string) {
    await this.quizzesService.deleteQuestion(id);
  }
}