
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';


import { AdminJwtGuard } from
  '../admin-auth/admin-jwt.guard.js';

import { AdminRolesGuard } from
  '../admin-auth/admin-roles.guard.js';

import { AdminRoles } from
  '../admin-auth/admin-roles.decorator.js';

import { QuizzesService } from './quizzes.service.js';

import {
  quizIdSchema,
  CreateQuizSchema,
  UpdateQuizSchema,
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuizListQuerySchema,
} from './dto/quiz.dto.js';

import { isPermanent, validate } from '../common/validation.js';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator.js';
import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';

// ==========================================
// PUBLIC QUIZ API
// ==========================================

@Controller('quizzes')
export class PublicQuizzesController {
  constructor(
    private readonly quizzes: QuizzesService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.quizzes.findPublic(
      validate(QuizListQuerySchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') rawId: string) {
    return this.quizzes.findPublicOne(
      validate(quizIdSchema, rawId),
    );
  }
}

// ==========================================
// ADMIN QUIZ API
// ==========================================

@Controller('admin/quizzes')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@AdminRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_EDITOR',
)
export class AdminQuizzesController {
  constructor(
    private readonly quizzes: QuizzesService,
    private readonly permanentDelete: PermanentDeleteService,
  ) {}

  @Get()
  findAll(@Query() query: unknown) {
    return this.quizzes.findAllQuizzes(
      validate(QuizListQuerySchema, query),
    );
  }

  @Get(':id')
  findOne(@Param('id') rawId: string) {
    return this.quizzes.findOneAdmin(
      validate(quizIdSchema, rawId),
    );
  }

  @Post()
  create(@Body() body: unknown) {
    return this.quizzes.createQuiz(
      validate(CreateQuizSchema, body),
    );
  }

  @Patch(':id')
  update(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.quizzes.updateQuiz(
      validate(quizIdSchema, rawId),
      validate(UpdateQuizSchema, body),
    );
  }

  @Delete(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  archive(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(quizIdSchema, rawId);

    // ?permanent=true -> Super Admin hard delete (audit-logged)
    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'Quiz', id, (tx) =>
        tx.quiz.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.quizzes.archiveQuiz(id);
  }

  @Get(':quizId/questions')
  getQuestions(
    @Param('quizId') rawQuizId: string,
  ) {
    return this.quizzes.getQuizQuestions(
      validate(quizIdSchema, rawQuizId),
    );
  }

  @Post('questions')
  createQuestion(@Body() body: unknown) {
    return this.quizzes.createQuestion(
      validate(CreateQuestionSchema, body),
    );
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id') rawId: string,
    @Body() body: unknown,
  ) {
    return this.quizzes.updateQuestion(
      validate(quizIdSchema, rawId),
      validate(UpdateQuestionSchema, body),
    );
  }

  @Delete('questions/:id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  deleteQuestion(
    @Param('id') rawId: string,
    @Query() query: unknown,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const id = validate(quizIdSchema, rawId);

    // ?permanent=true -> Super Admin hard delete (audit-logged)
    if (isPermanent(query)) {
      return this.permanentDelete.run(admin, 'QuizQuestion', id, (tx) =>
        tx.quizQuestion.delete({ where: { id }, select: { id: true } }),
      );
    }

    return this.quizzes.deleteQuestion(id);
  }
}
