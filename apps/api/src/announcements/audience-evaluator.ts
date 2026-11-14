
import { audienceRulesSchema } from './audience.schemas.js';

import type { PublicAnnouncementQuery } from './announcement-delivery.schemas.js';

export type AnnouncementContext = Pick<
  PublicAnnouncementQuery,
  'appId' | 'languageId' | 'levelId' | 'platform'
>;

export function matchesAudienceRules(
  rawRules: unknown,
  context: AnnouncementContext,
): boolean {
  const result = audienceRulesSchema.safeParse(rawRules);

  // Unknown or future rule versions must not
  // accidentally expose announcements.
  if (!result.success) {
    return false;
  }

  const { operator, conditions } = result.data;

  const matches = conditions.map((condition) => {
    const actual = context[condition.field];

    if (!actual) {
      return false;
    }

    return actual === condition.value;
  });

  return operator === 'ALL'
    ? matches.every(Boolean)
    : matches.some(Boolean);
}

export type DeliveryTarget = {
  exclude: boolean;
  segment: {
    isActive: boolean;
    rulesVersion: number;
    rulesJson: unknown;
  };
};

export function matchesAnnouncementTargets(
  targets: DeliveryTarget[],
  context: AnnouncementContext,
): boolean {
  // No targeting: globally visible announcement.
  if (targets.length === 0) {
    return true;
  }

  // Any inactive/unsupported attached segment
  // fails closed rather than broadening delivery.
  if (
    targets.some(
      (target) =>
        !target.segment.isActive ||
        target.segment.rulesVersion !== 1 ||
        !audienceRulesSchema.safeParse(
          target.segment.rulesJson,
        ).success,
    )
  ) {
    return false;
  }

  const includes = targets.filter(
    (target) => !target.exclude,
  );

  const excludes = targets.filter(
    (target) => target.exclude,
  );

  // At least one include must match when includes
  // are specified. Exclusions override includes.
  const included =
    includes.length === 0 ||
    includes.some((target) =>
      matchesAudienceRules(
        target.segment.rulesJson,
        context,
      ),
    );

  const excluded = excludes.some((target) =>
    matchesAudienceRules(
      target.segment.rulesJson,
      context,
    ),
  );

  return included && !excluded;
}
