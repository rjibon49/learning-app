import { Module } from '@nestjs/common';


import { PrismaModule } from '../prisma.module.js';

import { LearnerAuthModule } from '../learner-auth/learner-auth.module.js';

import { ProgressController } from './progress.controller.js';

import { ProgressService } from './progress.service.js';

@Module({
imports: [
PrismaModule,
LearnerAuthModule,
],

controllers: [
ProgressController,
],

providers: [
ProgressService,
],

exports: [
ProgressService,
],
})
export class ProgressModule {}