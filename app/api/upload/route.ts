import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

import { ensureWardrobeAssetDirs, originalsDir, publicAssetUrl } from '@/lib/wardrobe-assets';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const originalExtension = (file.name.split('.').pop() || '').toLowerCase();
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(originalExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: JPEG, PNG, GIF, WebP, HEIC, HEIF' },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max size: 20MB' },
        { status: 400 }
      );
    }

    await ensureWardrobeAssetDirs();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    let outputExtension = originalExtension || 'jpg';

    if (['heic', 'heif'].includes(originalExtension) || ['image/heic', 'image/heif'].includes(file.type)) {
      try {
        buffer = Buffer.from(await sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer());
        outputExtension = 'jpg';
      } catch (error) {
        console.error('HEIC conversion error:', error);
        return NextResponse.json(
          { error: 'This HEIC/HEIF image could not be converted. Please export it as JPEG or PNG and try again.' },
          { status: 400 }
        );
      }
    }

    const filename = `cloth-${timestamp}-${randomString}.${outputExtension}`;
    const filepath = join(originalsDir, filename);
    await writeFile(filepath, buffer);

    // Return the public URL
    const publicUrl = publicAssetUrl('originals', filename);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
