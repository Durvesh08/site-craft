/**
 * Object storage service backed by AWS S3.
 *
 * Required env vars (set these on Render):
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION          (e.g. us-east-1)
 *   AWS_S3_BUCKET       (your S3 bucket name)
 *
 * The bucket should be configured for public-read access so that uploaded
 * images can be served directly from S3 without a backend proxy.
 * Presigned PUT URLs are used for direct-from-browser uploads.
 */
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error('AWS_REGION env var is not set');
  return new S3Client({ region });
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET env var is not set');
  return bucket;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  /**
   * Generate a presigned PUT URL for direct browser-to-S3 upload.
   * Returns the presigned upload URL and the final public URL as objectPath.
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const s3 = getS3Client();
    const bucket = getBucket();
    const key = `uploads/${randomUUID()}`;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 900 });

    // Store the public URL so the caller can persist it
    const publicUrl = this.buildPublicUrl(bucket, key);
    // Embed publicUrl in a custom header-like query param so the route handler
    // can extract it without a second round-trip.
    return `${uploadURL}&__publicUrl=${encodeURIComponent(publicUrl)}`;
  }

  /**
   * Resolve a stored objectPath (public S3 URL) back to a presigned GET URL
   * so private/restricted objects can still be served via the backend proxy.
   * For publicly-readable buckets this is mostly a convenience wrapper.
   */
  async getPresignedGetUrl(objectPath: string, ttlSec = 3600): Promise<string> {
    if (objectPath.startsWith('https://')) {
      // Already a full URL — extract bucket + key from it.
      const { bucketName, key } = this.parsePublicUrl(objectPath);
      const s3 = getS3Client();
      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      return getSignedUrl(s3, command, { expiresIn: ttlSec });
    }
    throw new ObjectNotFoundError();
  }

  /**
   * Check if an object exists (used by serving routes).
   */
  async objectExists(objectPath: string): Promise<boolean> {
    try {
      const { bucketName, key } = this.parsePublicUrl(objectPath);
      const s3 = getS3Client();
      await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert a raw presigned PUT URL (+ embedded __publicUrl param) back into
   * the clean public URL that should be stored in the database.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Extract the __publicUrl we embedded during getObjectEntityUploadURL
    try {
      const url = new URL(rawPath);
      const embedded = url.searchParams.get('__publicUrl');
      if (embedded) return embedded;
    } catch {
      // not a URL — return as-is
    }
    return rawPath;
  }

  // ---- private helpers -------------------------------------------------------

  private buildPublicUrl(bucket: string, key: string): string {
    const region = process.env.AWS_REGION ?? 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private parsePublicUrl(url: string): { bucketName: string; key: string } {
    // Handles: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const match = url.match(
      /^https:\/\/([^.]+)\.s3\.[^.]+\.amazonaws\.com\/(.+)$/,
    );
    if (!match) throw new ObjectNotFoundError();
    return { bucketName: match[1], key: match[2] };
  }
}
