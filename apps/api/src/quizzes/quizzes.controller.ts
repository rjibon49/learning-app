
import {
  BadRequestException,
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

import { z } from 'zod';

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

function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException(
      z.flattenError(result.error),
    );
  }

  return result.data;
}

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
  archive(@Param('id') rawId: string) {
    return this.quizzes.archiveQuiz(
      validate(quizIdSchema, rawId),
    );
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
  ) {
    return this.quizzes.deleteQuestion(
      validate(quizIdSchema, rawId),
    );
  }
}
