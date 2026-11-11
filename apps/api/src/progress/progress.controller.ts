import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';


import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

import { LearnerJwtGuard } from '../learner-auth/learner-jwt.guard.js';

import type {
LearnerRequest,
} from '../learner-auth/learner-jwt.guard.js';

import { ProgressService } from './progress.service.js';

import {
reviewVocabularySchema,
updateLessonProgressSchema,
submitQuizSchema,
progressPaginationSchema,
} from './dto/progress.dto.js';

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

@Controller('learner/progress')
@UseGuards(LearnerJwtGuard)
export class ProgressController {
constructor(
private readonly progress: ProgressService,
) {}

private userId(request: LearnerRequest): string {
if (!request.learner?.id) {
throw new UnauthorizedException(
'Learner authentication required',
);
}

return request.learner.id;
}

// =======================================
// LEARNER DASHBOARD
// =======================================

@Get('dashboard')
dashboard(@Req() request: LearnerRequest) {
return this.progress.getDashboard(
this.userId(request),
);
}

// =======================================
// VOCABULARY REVIEW
// =======================================

@Post('vocabulary/review')
@Throttle({
short: { limit: 15, ttl: 1000 },
medium: { limit: 120, ttl: 60000 },
})
reviewVocabulary(
@Req() request: LearnerRequest,
@Body() body: unknown,
) {
return this.progress.reviewVocabulary(
this.userId(request),
validate(reviewVocabularySchema, body),
);
}

@Get('vocabulary/due')
getDueVocabulary(
@Req() request: LearnerRequest,
@Query() query: unknown,
) {
return this.progress.getDueVocabulary(
this.userId(request),
validate(progressPaginationSchema, query),
);
}

// =======================================
// LESSON COMPLETION
// =======================================

@Post('lessons')
@Throttle({
short: { limit: 10, ttl: 1000 },
medium: { limit: 60, ttl: 60000 },
})
updateLesson(
@Req() request: LearnerRequest,
@Body() body: unknown,
) {
return this.progress.updateLessonProgress(
this.userId(request),
validate(updateLessonProgressSchema, body),
);
}

// =======================================
// QUIZ ATTEMPTS
// =======================================

@Post('quizzes/submit')
@Throttle({
short: { limit: 2, ttl: 1000 },
medium: { limit: 15, ttl: 60000 },
})
submitQuiz(
@Req() request: LearnerRequest,
@Body() body: unknown,
) {
return this.progress.submitQuiz(
this.userId(request),
validate(submitQuizSchema, body),
);
}

@Get('quizzes/history')
getQuizHistory(
@Req() request: LearnerRequest,
@Query() query: unknown,
) {
return this.progress.getQuizHistory(
this.userId(request),
validate(progressPaginationSchema, query),
);
}
}