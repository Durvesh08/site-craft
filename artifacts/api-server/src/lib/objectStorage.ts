/**
 * Object storage service — supports Cloudflare R2 (recommended) and AWS S3.
 *
 * ── Cloudflare R2 (recommended — free egress forever) ────────────────────────
 *   R2_ACCOUNT_ID        Your Cloudflare account ID
 *   R2_ACCESS_KEY_ID     R2 API token → "Access Key ID"
 *   R2_SECRET_ACCESS_KEY R2 API token → "Secret Access Key"
 *   R2_BUCKET            Bucket name (e.g. sitecraft-assets)
 *   R2_PUBLIC_URL        Public bucket URL (e.g. https://pub-xxxx.r2.dev)
 *                        Enable via Cloudflare dashboard → R2 bucket → Settings → Public Access
 *
 * ── AWS S3 fallback ──────────────────────────────────────────────────────────
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION           (e.g. us-east-1)
 *   AWS_S3_BUCKET
 *
 * R2 is used when R2_ACCOUNT_ID is set; otherwise falls back to AWS S3.
 */
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ---------------------------------------------------------------------------
// Client factory — auto-selects R2 vs S3 based on environment
// ---------------------------------------------------------------------------

interface StorageConfig {
  client: S3Client;
  bucket: string;
  /** Base public URL for serving uploaded files, e.g. https://pub-xxx.r2.dev */
  publicBaseUrl: string;
}

function getStorageConfig(): StorageConfig {
  const r2AccountId = process.env.R2_ACCOUNT_ID;

  if (r2AccountId) {
    // ── Cloudflare R2 ──────────────────────────────────────────────────────
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicBaseUrl = process.env.R2_PUBLIC_URL;

    if (!accessKeyId) throw new Error('R2_ACCESS_KEY_ID env var is not set');
    if (!secretAccessKey) throw new Error('R2_SECRET_ACCESS_KEY env var is not set');
    if (!bucket) throw new Error('R2_BUCKET env var is not set');
    if (!publicBaseUrl) throw new Error('R2_PUBLIC_URL env var is not set — enable Public Access in the Cloudflare R2 dashboard');

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    return { client, bucket, publicBaseUrl: publicBaseUrl.replace(/\/$/, '') };
  }

  // ── AWS S3 fallback ────────────────────────────────────────────────────────
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!region) throw new Error('AWS_REGION env var is not set (or set R2_ACCOUNT_ID for Cloudflare R2)');
  if (!bucket) throw new Error('AWS_S3_BUCKET env var is not set (or set R2_ACCOUNT_ID for Cloudflare R2)');

  const client = new S3Client({ region });
  const publicBaseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;

  return { client, bucket, publicBaseUrl };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  /**
   * Generate a presigned PUT URL for direct browser-to-storage upload.
   *
   * Returns a raw string that contains both the presigned upload URL and the
   * final public URL embedded as a query param (`__publicUrl`).
   * Call `normalizeObjectEntityPath()` to extract the clean public URL.
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const { client, bucket, publicBaseUrl } = getStorageConfig();
    const key = `uploads/${randomUUID()}`;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const uploadURL = await getSignedUrl(client, command, { expiresIn: 900 });

    const publicUrl = `${publicBaseUrl}/${key}`;

    // Embed the public URL so the route handler can extract it without a
    // second round-trip. Stripped before sending to the browser.
    return `${uploadURL}&__publicUrl=${encodeURIComponent(publicUrl)}`;
  }

  /**
   * Convert the raw internal URL (with embedded __publicUrl) into the clean
   * public URL that should be stored in the database and served to clients.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      const embedded = url.searchParams.get('__publicUrl');
      if (embedded) return embedded;
    } catch {
      // not a URL
    }
    return rawPath;
  }

  /**
   * Generate a presigned GET URL for a stored object path.
   * For public buckets this is mostly a fallback — the public URL already works.
   */
  async getPresignedGetUrl(publicUrl: string, ttlSec = 3600): Promise<string> {
    const { client, bucket } = getStorageConfig();
    const key = this.extractKey(publicUrl);
    if (!key) throw new ObjectNotFoundError();

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn: ttlSec });
  }

  async objectExists(publicUrl: string): Promise<boolean> {
    try {
      const { client, bucket } = getStorageConfig();
      const key = this.extractKey(publicUrl);
      if (!key) return false;
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  // ── private ────────────────────────────────────────────────────────────────

  private extractKey(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);
      // pathname is e.g. /uploads/uuid  →  strip leading slash
      return url.pathname.replace(/^\//, '') || null;
    } catch {
      return null;
    }
  }
}
