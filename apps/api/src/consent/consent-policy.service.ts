
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ConsentPolicyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getActivePolicy() {
    const now = new Date();

    const policy = await this.prisma.consentPolicy.findFirst({
      where: {
        isActive: true,
        OR: [
          { effectiveAt: null },
          { effectiveAt: { lte: now } },
        ],
      },
      select: {
        id: true,
        version: true,
        title: true,
        documentUrl: true,
        effectiveAt: true,
      },
      orderBy: [
        { effectiveAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      available: policy !== null,
      policy: policy
        ? {
            version: policy.version,
            title: policy.title,
            documentUrl: policy.documentUrl,
            effectiveAt: policy.effectiveAt,
          }
        : null,
    };
  }

  async requireActivePolicy() {
    const result = await this.getActivePolicy();

    if (!result.available || !result.policy) {
      throw new ServiceUnavailableException(
        'Marketing consent policy is not configured.',
      );
    }

    return result.policy;
  }
}
