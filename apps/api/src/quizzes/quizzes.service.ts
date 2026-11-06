import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { CreateQuizDto, UpdateQuizDto, CreateQuestionDto, UpdateQuestionDto } from './dto/quiz.dto.js';

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= QUIZZES =================
  async findAllQuizzes(appId?: string) {
    return this.prisma.quiz.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        lesson: { select: { title: true } },
        _count: { select: { questions: true } }, // কয়টি প্রশ্ন আছে তা দেখাবে
      },
    });
  }

  async createQuiz(dto: CreateQuizDto) {
    return this.prisma.quiz.create({ data: dto as any });
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return this.prisma.quiz.update({ where: { id }, data: dto as any });
  }

  async deleteQuiz(id: string) {
    await this.prisma.quiz.delete({ where: { id } });
  }

  // ================= QUIZ QUESTIONS =================
  async getQuizQuestions(quizId: string) {
    return this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createQuestion(dto: CreateQuestionDto) {
    return this.prisma.quizQuestion.create({ data: dto as any });
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.quizQuestion.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return this.prisma.quizQuestion.update({ where: { id }, data: dto as any });
  }

  async deleteQuestion(id: string) {
    await this.prisma.quizQuestion.delete({ where: { id } });
  }
}