import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  type INestApplication,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import type { PrismaService } from '../prisma.service.js';
import { enableBigIntJson } from './bigint-json.js';
import { PermanentDeleteService } from './permanent-delete.service.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';
import { idSchema, isPermanent, validate } from './validation.js';

const prismaError = (code: string) =>
  Object.assign(new Error(`prisma ${code}`), { code, meta: {} });

@Controller('t')
class TestController {
  @Get('unique')
  unique() {
    throw prismaError('P2002');
  }

  @Get('fk')
  fk() {
    throw prismaError('P2003');
  }

  @Get('missing')
  missing() {
    throw prismaError('P2025');
  }

  @Get('bad')
  bad() {
    throw new BadRequestException('normal nest error');
  }

  @Get('bigint')
  bigint() {
    return { fileSize: 2048n, huge: 2n ** 70n };
  }
}

describe('common/validation', () => {
  it('returns parsed data', () => {
    expect(validate(idSchema, 'ckz8x1y2z0000abcd1234efgh')).toBe(
      'ckz8x1y2z0000abcd1234efgh',
    );
  });

  it('throws 400 for invalid input', () => {
    expect(() => validate(idSchema, '../etc/passwd')).toThrow(
      BadRequestException,
    );
  });

  it('reads ?permanent=true', () => {
    expect(isPermanent({ permanent: 'true' })).toBe(true);
    expect(isPermanent({ permanent: '1' })).toBe(true);
    expect(isPermanent({})).toBe(false);
    expect(isPermanent(undefined)).toBe(false);
    expect(isPermanent({ permanent: 'false' })).toBe(false);
    expect(() => isPermanent({ permanent: 'yes' })).toThrow(
      BadRequestException,
    );
  });
});

describe('PrismaExceptionFilter + BigInt JSON (HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    enableBigIntJson();

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(
      new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('P2002 -> 409', async () => {
    await request(app.getHttpServer()).get('/t/unique').expect(409);
  });

  it('P2003 (still referenced) -> 409 with helpful message', async () => {
    const res = await request(app.getHttpServer()).get('/t/fk').expect(409);
    expect(res.body.message).toMatch(/still used/);
  });

  it('P2025 -> 404', async () => {
    await request(app.getHttpServer()).get('/t/missing').expect(404);
  });

  it('keeps normal Nest errors unchanged', async () => {
    const res = await request(app.getHttpServer()).get('/t/bad').expect(400);
    expect(res.body.message).toBe('normal nest error');
  });

  it('serializes BigInt instead of crashing', async () => {
    const res = await request(app.getHttpServer()).get('/t/bigint').expect(200);
    expect(res.body).toEqual({
      fileSize: 2048,
      huge: (2n ** 70n).toString(),
    });
  });
});

describe('PermanentDeleteService', () => {
  const admin = (role: AuthenticatedAdmin['role']): AuthenticatedAdmin => ({
    id: 'admin1',
    email: 'a@example.com',
    displayName: null,
    role,
  });

  function setup() {
    const calls: string[] = [];
    const tx = {
      adminAuditLog: {
        create: async (args: { data: { action: string; entityType: string } }) => {
          calls.push(`audit:${args.data.action}:${args.data.entityType}`);
        },
      },
    };
    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      adminAuditLog: tx.adminAuditLog,
    } as unknown as PrismaService;

    return { service: new PermanentDeleteService(prisma), calls };
  }

  it('only SUPER_ADMIN may permanently delete', async () => {
    const { service, calls } = setup();

    for (const role of ['ADMIN', 'CONTENT_EDITOR'] as const) {
      await expect(
        service.run(admin(role), 'Course', 'c1', async () => {
          calls.push('deleted');
        }),
      ).rejects.toThrow(ForbiddenException);
    }

    await expect(
      service.run(undefined, 'Course', 'c1', async () => undefined),
    ).rejects.toThrow(ForbiddenException);

    expect(calls).toEqual([]);
  });

  it('deletes and writes an audit log row', async () => {
    const { service, calls } = setup();

    const result = await service.run(admin('SUPER_ADMIN'), 'Course', 'c1', async () => {
      calls.push('deleted');
    });

    expect(result).toEqual({
      success: true,
      permanent: true,
      entityType: 'Course',
      id: 'c1',
    });
    expect(calls).toEqual(['deleted', 'audit:PERMANENT_DELETE:Course']);
  });
});
