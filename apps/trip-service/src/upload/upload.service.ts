import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { UploadImageResult } from '../trips/trips.service';

@Injectable()
export class UploadService {
  async uploadTripImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image is required');
    }
    return new Promise<UploadImageResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'trips/covers' },
        (error, result) => {
          if (error) {
            return reject(new Error(error.message));
          }

          if (!result) {
            return reject(new Error('No result returned from Cloudinary'));
          }

          resolve({
            imageUrl: result.secure_url,
            imagePublicId: result.public_id,
          });
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
