import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export type TargetContext = {
  appId?: string; languageId?: string; levelId?: string;
  platform?: 'ANDROID' | 'IOS' | 'WEB'; country?: string;
  subscription?: 'FREE' | 'PREMIUM'; inactiveDays?: number;
};
type Field = 'appId' | 'languageId' | 'levelId' | 'platform' | 'country' | 'subscription' | 'inactiveDays';
type Rule = { field: Field; operator: 'EQ' | 'GTE'; value: string | number };
type RuleSet = { version: 1; operator: 'ALL' | 'ANY'; conditions: Rule[] };

function parseRule(value: unknown): RuleSet | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const x = value as Record<string, unknown>;
  if (x.version !== 1 || !['ALL', 'ANY'].includes(String(x.operator)) ||
    !Array.isArray(x.conditions) || x.conditions.length < 1 || x.conditions.length > 20) return null;
  const validFields = ['appId', 'languageId', 'levelId', 'platform', 'country', 'subscription', 'inactiveDays'];
  for (const item of x.conditions) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const c = item as Record<string, unknown>;
    if (!validFields.includes(String(c.field))) return null;
    if (c.field === 'inactiveDays') {
      if (c.operator !== 'GTE' || !Number.isInteger(c.value) || Number(c.value) < 0 || Number(c.value) > 3650) return null;
    } else {
      if (c.operator !== 'EQ' || typeof c.value !== 'string' || c.value.length < 1 || c.value.length > 191) return null;
      if (c.field === 'platform' && !['WEB', 'ANDROID', 'IOS'].includes(c.value)) return null;
      if (c.field === 'subscription' && !['FREE', 'PREMIUM'].includes(c.value)) return null;
      if (c.field === 'country' && !/^[A-Z]{2}$/.test(c.value)) return null;
    }
  }
  return x as RuleSet;
}

@Injectable()
export class AdvancedTargetingService {
  constructor(private readonly db: PrismaService) {}

  /** Context is server-derived wherever possible. Country deliberately stays
   * unavailable until an explicitly user-chosen, validated country is stored.
   */
  async forLearner(userId: string, appId?: string, platform?: TargetContext['platform']): Promise<TargetContext | null> {
    const now = new Date();
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { isActive: true, lastLoginAt: true, lastActivityDate: true } });
    if (!user?.isActive) return null;
    const app = appId ? await this.db.app.findUnique({
      where: { id: appId }, select: { id: true, isActive: true, languageId: true, levelId: true },
    }) : null;
    if (appId && !app?.isActive) return null;
    const paid = await this.db.subscription.findFirst({ where: {
      userId, ...(appId ? { appId } : {}), status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    }, select: { id: true } });
    // lastActivityDate is DATE (day-level); missing data must not be
    // interpreted as inactivity, to avoid targeting users on absent tracking.
    const lastActivity = user.lastActivityDate ?? user.lastLoginAt;
    const inactiveDays = lastActivity ? Math.max(0, Math.floor((now.getTime() - lastActivity.getTime()) / 86400000)) : undefined;
    return { appId: app?.id, languageId: app?.languageId, levelId: app?.levelId ?? undefined,
      platform, subscription: paid ? 'PREMIUM' : 'FREE', inactiveDays };
  }

  matchesSegment(raw: unknown, ctx: TargetContext): boolean {
    const rules = parseRule(raw);
    if (!rules) return false;
    const matches = rules.conditions.map(rule => {
      const actual = ctx[rule.field];
      if (actual === undefined || actual === null) return false;
      return rule.operator === 'GTE' ? Number(actual) >= Number(rule.value) : String(actual) === String(rule.value);
    });
    return rules.operator === 'ALL' ? matches.every(Boolean) : matches.some(Boolean);
  }

  matchesTargets(targets: Array<{ exclude: boolean; segment: { isActive: boolean; rulesVersion: number; rulesJson: unknown } }>, ctx: TargetContext): boolean {
    if (!targets.length) return true;
    if (targets.some(t => !t.segment.isActive || t.segment.rulesVersion !== 1 || !parseRule(t.segment.rulesJson))) return false;
    const includes = targets.filter(t => !t.exclude);
    const excludes = targets.filter(t => t.exclude);
    return (includes.length === 0 || includes.some(t => this.matchesSegment(t.segment.rulesJson, ctx))) &&
      !excludes.some(t => this.matchesSegment(t.segment.rulesJson, ctx));
  }
}
