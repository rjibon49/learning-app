import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  // 1. Create or Update Daily Log (Post)
  async logDailyActivity(userId: string, durationMinutes: number) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: ['STREAK_REQUIRED_DAYS', 'STREAK_REWARD_DAYS', 'DAILY_MINUTES_REQUIRED'] } },
    });
    const getSetting = (key: string, def: number) => Number(settings.find(s => s.key === key)?.value || def);

    const requiredDays = getSetting('STREAK_REQUIRED_DAYS', 7);
    const rewardDays = getSetting('STREAK_REWARD_DAYS', 3);
    const requiredMinutes = getSetting('DAILY_MINUTES_REQUIRED', 5);

    let activity = await this.prisma.userActivity.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (activity) {
      activity = await this.prisma.userActivity.update({
        where: { id: activity.id },
        data: { durationMinutes: activity.durationMinutes + durationMinutes },
      });
    } else {
      activity = await this.prisma.userActivity.create({
        data: { userId, date: today, durationMinutes },
      });
    }

    if (!activity.isStreakCounted && activity.durationMinutes >= requiredMinutes) {
      await this.prisma.userActivity.update({
        where: { id: activity.id },
        data: { isStreakCounted: true },
      });

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const newStreak = (user?.currentStreak || 0) + 1;
      const newLongest = Math.max(newStreak, user?.longestStreak || 0);

      let adFreeUpdate = user?.adFreeUntil;

      if (newStreak % requiredDays === 0) {
        const baseDate = adFreeUpdate && adFreeUpdate > new Date() ? adFreeUpdate : new Date();
        adFreeUpdate = new Date(baseDate.getTime() + rewardDays * 24 * 60 * 60 * 1000);
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActivityDate: today,
          adFreeUntil: adFreeUpdate,
        },
      });

      return { message: 'Activity logged, streak updated!', newStreak, adFreeUntil: adFreeUpdate };
    }

    return { message: 'Activity logged.', duration: activity.durationMinutes };
  }

  // 2. Read All Activities for a User (Get)
  async getUserActivities(userId: string) {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });
  }

  // 3. Read All Activities Admin (Get)
  async getAllActivities() {
    return this.prisma.userActivity.findMany({
      orderBy: { date: 'desc' },
      take: 100,
      include: { user: { select: { displayName: true, email: true } } }
    });
  }

  // 4. Update specific log manually (Admin) (Patch)
  async updateActivityLog(id: string, durationMinutes: number) {
    const activity = await this.prisma.userActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity log not found');
    return this.prisma.userActivity.update({
      where: { id },
      data: { durationMinutes },
    });
  }

  // 5. Delete specific log manually (Admin) (Delete)
  async deleteActivityLog(id: string) {
    return this.prisma.userActivity.delete({ where: { id } });
  }
}