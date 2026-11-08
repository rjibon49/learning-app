import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { PrismaModule } from '../prisma.module.js';

@Module({
  imports: [PrismaModule], // PrismaService ব্যবহার করার জন্য
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}