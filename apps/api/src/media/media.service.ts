import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PrismaService } from '../prisma.service.js';
import type { MediaType, MediaVisibility } from '../generated/prisma/client.js';

@Injectable()
export class MediaService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID');
    this.bucketName = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    // Public URL না থাকলে এরর থ্রো করবে, যাতে ভুল লিংকে সেভ না হয়
    this.publicUrl = this.config.getOrThrow<string>('R2_PUBLIC_URL').replace(/\/$/, '');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  private determineMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('audio/')) return 'AUDIO';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    return 'DOCUMENT';
  }

  async uploadFile(file: Express.Multer.File, appId?: string, visibility: MediaVisibility = 'PUBLIC') {
    let fileBuffer = file.buffer;
    
    // অরিজিনাল ফাইলের নাম থেকে স্পেস এবং স্পেশাল ক্যারেক্টার রিমুভ করা
    const originalNameParts = file.originalname.split('.');
    const originalExt = originalNameParts.pop()?.toLowerCase() || '';
    const baseName = originalNameParts.join('-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    
    let fileExt = originalExt;
    let mimeType = file.mimetype;
    let fileSize = file.size;

    const type = this.determineMediaType(mimeType);

    if (type === 'IMAGE' && mimeType !== 'image/svg+xml') {
      try {
        fileBuffer = await sharp(file.buffer).webp({ quality: 80, effort: 4 }).toBuffer();
        fileExt = 'webp';
        mimeType = 'image/webp';
        fileSize = fileBuffer.length;
      } catch (err) {
        throw new InternalServerErrorException('Image processing failed');
      }
    }

    // ডুপ্লিকেট নাম এড়াতে শেষে একটি ছোট ইউনিক স্ট্রিং যোগ করা হলো
    const shortId = Math.random().toString(36).substring(2, 8);
    const finalFileName = `${baseName}-${shortId}.${fileExt}`;
    
    const folder = appId || 'common';
    const objectKey = `${folder}/${type}/${finalFileName}`; // Example: A1/IMAGE/my-image-x8a2k.webp

    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType,
      }));
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload media to Cloudflare R2');
    }

    const fileUrl = `${this.publicUrl}/${objectKey}`;

    const asset = await this.prisma.mediaAsset.create({
      data: {
        appId: appId || null,
        type,
        visibility,
        storageProvider: 'R2',
        bucket: this.bucketName,
        objectKey,
        publicUrl: fileUrl,
        originalName: file.originalname,
        mimeType: mimeType,
        fileSize: BigInt(fileSize),
      },
    });

    return { ...asset, fileSize: Number(asset.fileSize) };
  }

  async findAll(appId?: string) {
    const assets = await this.prisma.mediaAsset.findMany({
      where: appId ? { appId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return assets.map(asset => ({ ...asset, fileSize: Number(asset.fileSize) }));
  }

  async deleteFile(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    try {
      // S3 (Cloudflare R2) থেকে রিমুভ
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: asset.objectKey,
      }));
    } catch (error) {
      console.error('Failed to delete from R2, but proceeding to delete from DB');
    }

    // ডাটাবেস থেকে রিমুভ
    await this.prisma.mediaAsset.delete({ where: { id } });
    return { success: true };
  }
}