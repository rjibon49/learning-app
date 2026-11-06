import { Controller, Get, Post, Delete, Param, Query, UploadedFile, UseGuards, UseInterceptors, BadRequestException, Body } from '@nestjs/common';
// ... (অন্যান্য ইমপোর্ট আগের মতোই থাকবে)
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service.js';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard.js';
import { AdminRolesGuard } from '../admin-auth/admin-roles.guard.js';
import { AdminRoles } from '../admin-auth/admin-roles.decorator.js';
import 'multer';

@Controller('media')
@UseGuards(AdminJwtGuard, AdminRolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  async findAll(@Query('appId') appId?: string) {
    return this.mediaService.findAll(appId);
  }

  @Post('upload')
  @AdminRoles('SUPER_ADMIN', 'ADMIN', 'CONTENT_EDITOR')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('appId') appId?: string,
    @Body('visibility') visibility?: 'PUBLIC' | 'PRIVATE',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided in the request');
    }
    
    // FileInterceptor Multer type safety check (TypeScript workaround for fast execution)
    const multerFile = file as Express.Multer.File;
    return this.mediaService.uploadFile(multerFile, appId, visibility as any);
  }
  
  @Delete(':id')
  @AdminRoles('SUPER_ADMIN', 'ADMIN')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteFile(id);
  }
}