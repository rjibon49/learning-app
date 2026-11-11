
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { fileTypeFromBuffer } from 'file-type';
import { PDFDocument } from 'pdf-lib';

import sharp from 'sharp';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

import {
  mkdtemp,
  writeFile,
  rm,
} from 'node:fs/promises';

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

import { PrismaService } from '../prisma.service.js';

import type {
  MediaType,
  MediaVisibility,
} from '../generated/prisma/client.js';

import type {
  MediaListInput,
} from './media.schemas.js';

const execFileAsync = promisify(execFile);

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_IMAGE_DIMENSION = 2560;

type ProcessedMedia = {
  buffer: Buffer;
  type: MediaType;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
  pageCount?: number;
  optimizedFormat?: string;
};

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accountId =
      this.config.getOrThrow<string>('R2_ACCOUNT_ID');

    this.bucket =
      this.config.getOrThrow<string>('R2_BUCKET_NAME');

    this.apiBaseUrl =
      this.config
        .getOrThrow<string>('MEDIA_API_BASE_URL')
        .replace(/\/+$/, '');

    const baseUrl = new URL(this.apiBaseUrl);
    const environment =
      this.config.get<string>('NODE_ENV') ??
      'development';

    if (
      environment === 'production' &&
      baseUrl.protocol !== 'https:'
    ) {
      throw new Error(
        'MEDIA_API_BASE_URL must use HTTPS in production',
      );
    }

    this.s3 = new S3Client({
      region: 'auto',

      endpoint:
        `https://${accountId}.r2.cloudflarestorage.com`,

      credentials: {
        accessKeyId:
          this.config.getOrThrow<string>(
            'R2_ACCESS_KEY_ID',
          ),

        secretAccessKey:
          this.config.getOrThrow<string>(
            'R2_SECRET_ACCESS_KEY',
          ),
      },

      forcePathStyle: true,
    });
  }

  // ==========================================
  // MALWARE SCANNING
  // ==========================================

  private async scanFile(
    buffer: Buffer,
  ): Promise<void> {
    const production =
      this.config.get<string>('NODE_ENV') ===
      'production';

    const scanner =
      this.config.get<string>(
        'MEDIA_SCANNER_BINARY',
      );

    if (!scanner) {
      if (production) {
        throw new ServiceUnavailableException(
          'Media antivirus scanner is not configured',
        );
      }

      // Local development only.
      // Production always requires a scanner.
      return;
    }

    const directory = await mkdtemp(
      join(tmpdir(), 'learning-media-'),
    );

    const filePath = join(
      directory,
      randomUUID(),
    );

    try {
      await writeFile(filePath, buffer, {
        mode: 0o600,
      });

      await execFileAsync(
        scanner,
        ['--no-summary', filePath],
        {
          timeout: 60000,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
      );
    } catch (error: unknown) {
      const exitCode =
        typeof error === 'object' &&
        error !== null &&
        'code' in error
          ? error.code
          : undefined;

      if (
        exitCode === 1 ||
        exitCode === '1'
      ) {
        throw new BadRequestException(
          'File failed malware scanning',
        );
      }

      throw new ServiceUnavailableException(
        'Media antivirus scan failed',
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  }

  // ==========================================
  // IMAGE OPTIMIZATION
  // ==========================================

  private async processImage(
    buffer: Buffer,
  ): Promise<ProcessedMedia> {
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        'Image exceeds 15 MB limit',
      );
    }

    try {
      const metadata = await sharp(buffer, {
        limitInputPixels: MAX_IMAGE_PIXELS,
        failOn: 'error',
      }).metadata();

      const supported = [
        'jpeg',
        'png',
        'webp',
        'avif',
        'tiff',
      ];

      if (
        !metadata.format ||
        !supported.includes(metadata.format)
      ) {
        throw new BadRequestException(
          'Unsupported image format',
        );
      }

      const output = await sharp(buffer, {
        limitInputPixels: MAX_IMAGE_PIXELS,
        failOn: 'error',
      })
        .rotate()
        .resize({
          width: MAX_IMAGE_DIMENSION,
          height: MAX_IMAGE_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
          effort: 5,
        })
        .toBuffer();

      const resultMetadata =
        await sharp(output).metadata();

      return {
        buffer: output,
        type: 'IMAGE',
        mimeType: 'image/webp',
        extension: 'webp',
        width: resultMetadata.width,
        height: resultMetadata.height,
        optimizedFormat: 'WEBP',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Invalid or unsupported image',
      );
    }
  }

  // ==========================================
  // PDF VALIDATION
  // ==========================================

  private async processPdf(
    buffer: Buffer,
  ): Promise<ProcessedMedia> {
    if (
      !buffer.subarray(0, 5)
        .equals(Buffer.from('%PDF-'))
    ) {
      throw new BadRequestException(
        'Invalid PDF file signature',
      );
    }

    try {
      const pdf = await PDFDocument.load(buffer, {
        ignoreEncryption: false,
        updateMetadata: false,
      });

      const pageCount = pdf.getPageCount();

      if (
        pageCount < 1 ||
        pageCount > 1000
      ) {
        throw new BadRequestException(
          'PDF page count is not supported',
        );
      }

      return {
        buffer,
        type: 'PDF',
        mimeType: 'application/pdf',
        extension: 'pdf',
        pageCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Invalid, encrypted or unsupported PDF',
      );
    }
  }

  // ==========================================
  // FILE IDENTIFICATION
  // ==========================================

  private async processFile(
    file: Express.Multer.File,
  ): Promise<ProcessedMedia> {
    if (
      !file.buffer ||
      file.buffer.length === 0
    ) {
      throw new BadRequestException(
        'Uploaded file is empty',
      );
    }

    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'File exceeds 25 MB limit',
      );
    }

    const detected = await fileTypeFromBuffer(
      file.buffer,
    );

    if (!detected) {
      throw new BadRequestException(
        'Unsupported or unrecognized file format',
      );
    }

    const imageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/tiff',
    ];

    if (imageTypes.includes(detected.mime)) {
      return this.processImage(file.buffer);
    }

    if (detected.mime === 'application/pdf') {
      return this.processPdf(file.buffer);
    }

    const audioTypes: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
    };

    const audioExtension =
      audioTypes[detected.mime];

    if (audioExtension) {
      return {
        buffer: file.buffer,
        type: 'AUDIO',
        mimeType: detected.mime,
        extension: audioExtension,
      };
    }

    // Office documents are processed by the
    // isolated converter in Phase 3.8B.
    throw new BadRequestException(
      'This format is not enabled yet. Use PDF, supported images or audio.',
    );
  }

  // ==========================================
  // UPLOAD TO CLOUDFLARE R2
  // ==========================================

  async uploadFile(
    file: Express.Multer.File,
    appId?: string,
    visibility: MediaVisibility = 'PRIVATE',
  ) {
    if (appId) {
      const app = await this.prisma.app.findUnique({
        where: { id: appId },
        select: { id: true },
      });

      if (!app) {
        throw new BadRequestException(
          'Selected app does not exist',
        );
      }
    }

    const processed = await this.processFile(file);

    await this.scanFile(file.buffer);

    // Scan transformed output too.
    if (processed.buffer !== file.buffer) {
      await this.scanFile(processed.buffer);
    }

    const checksum = createHash('sha256')
      .update(processed.buffer)
      .digest('hex');

    const objectKey = [
      'learning-platform',
      appId ?? 'shared',
      processed.type.toLowerCase(),
      `${randomUUID()}.${processed.extension}`,
    ].join('/');

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: processed.buffer,
          ContentType: processed.mimeType,
          CacheControl:
            visibility === 'PUBLIC'
              ? 'public, max-age=3600'
              : 'private, no-store',
        }),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Cloudflare R2 upload failed',
      );
    }

    try {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          appId: appId ?? null,

          type: processed.type,
          visibility,
          status: 'READY',

          storageProvider: 'R2',
          bucket: this.bucket,
          objectKey,

          publicUrl: null,

          originalName:
            file.originalname.slice(0, 255),

          originalMimeType:
            file.mimetype.slice(0, 255),

          mimeType: processed.mimeType,

          originalSize:
            BigInt(file.buffer.length),

          fileSize:
            BigInt(processed.buffer.length),

          width: processed.width,
          height: processed.height,
          pageCount: processed.pageCount,

          optimizedFormat:
            processed.optimizedFormat,

          checksumSha256: checksum,
        },
      });

      const publicUrl =
        visibility === 'PUBLIC'
          ? `${this.apiBaseUrl}/media/public/${asset.id}`
          : null;

      if (publicUrl) {
        await this.prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { publicUrl },
        });
      }

      return {
        ...asset,
        publicUrl,
        fileSize: Number(asset.fileSize),
        originalSize: Number(asset.originalSize),
      };
    } catch {
      // Avoid orphaned objects if DB write fails.
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
          }),
        );
      } catch {
        // Requires operational monitoring.
      }

      throw new InternalServerErrorException(
        'Failed to save media metadata',
      );
    }
  }

  // ==========================================
  // MEDIA LIST FOR ADMIN CMS
  // ==========================================

  async findAll(query: MediaListInput) {
    const where = query.appId
      ? { appId: query.appId }
      : {};

    const [items, total] =
      await this.prisma.$transaction([
        this.prisma.mediaAsset.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.mediaAsset.count({ where }),
      ]);

    return {
      data: items.map((asset) => ({
        ...asset,
        fileSize:
          asset.fileSize === null
            ? null
            : Number(asset.fileSize),
        originalSize:
          asset.originalSize === null
            ? null
            : Number(asset.originalSize),
      })),

      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ==========================================
  // PRIVATE / PUBLIC SIGNED ACCESS
  // ==========================================

  private async signAsset(
    id: string,
    publicOnly: boolean,
  ) {
    const asset =
      await this.prisma.mediaAsset.findFirst({
        where: {
          id,
          status: 'READY',
          ...(publicOnly
            ? { visibility: 'PUBLIC' }
            : {}),
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Media asset not found',
      );
    }

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: asset.bucket ?? this.bucket,
        Key: asset.objectKey,
      }),
      {
        expiresIn: 120,
      },
    );

    return {
      url,
      expiresIn: 120,
    };
  }

  getPublicAccess(id: string) {
    return this.signAsset(id, true);
  }

  getAdminAccess(id: string) {
    return this.signAsset(id, false);
  }

  // ==========================================
  // SECURE DELETE
  // ==========================================

  async deleteFile(id: string) {
    const asset =
      await this.prisma.mediaAsset.findUnique({
        where: { id },
      });

    if (!asset) {
      throw new NotFoundException(
        'Media asset not found',
      );
    }

    const [vocabularyCount, lessonCount] =
      await this.prisma.$transaction([
        this.prisma.vocabulary.count({
          where: {
            OR: [
              { imageAssetId: id },
              { audioAssetId: id },
            ],
          },
        }),

        this.prisma.lessonResource.count({
          where: {
            assetId: id,
          },
        }),
      ]);

    if (vocabularyCount + lessonCount > 0) {
      throw new ConflictException(
        'Media is in use. Detach it before deleting.',
      );
    }

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: asset.bucket ?? this.bucket,
          Key: asset.objectKey,
        }),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Failed to delete object from R2',
      );
    }

    await this.prisma.mediaAsset.delete({
      where: { id },
    });

    return {
      success: true,
    };
  }
}
