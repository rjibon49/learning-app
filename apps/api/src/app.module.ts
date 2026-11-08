import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminAuthModule } from './admin-auth/admin-auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppsModule } from './apps/apps.module.js';
import { envSchema } from './env.schema.js';
import { PrismaModule } from './prisma.module.js';
import { VocabularyModule } from './vocabulary/vocabulary.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { MediaModule } from './media/media.module.js';
import { FlashcardsModule } from './flashcards/flashcards.module.js';
import { QuizzesModule } from './quizzes/quizzes.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { UsersModule } from './users/users.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { AdminsModule } from './admins/admins.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { AdsModule } from './ads/ads.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { PromotionsModule } from './promotions/promotions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),

    AdminsModule,
    AdminAuthModule,
    AdsModule,
    AppsModule,
    AuditLogsModule,
    CoursesModule,
    VocabularyModule,
    FlashcardsModule,
    MediaModule,
    ImportsModule,
    PrismaModule,
    QuizzesModule,
    SettingsModule,
    SubscriptionsModule,
    UsersModule,
    ActivityModule,
    PromotionsModule,

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
