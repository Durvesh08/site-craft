import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function isAuthenticated(req: Request): boolean {
  if ('isAuthenticated' in req && typeof req.isAuthenticated === 'function') {
    return req.isAuthenticated();
  }
  return !!(req as any).user;
}

/**
 * POST /storage/uploads/request-url
 *
 * Returns a presigned S3 PUT URL for direct browser-to-S3 upload, plus the
 * final public URL (objectPath) that the client should store in the database.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      // Raw URL includes the presigned PUT URL; objectPath is the clean public URL.
      const rawUploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(rawUploadURL);

      // Strip the embedded __publicUrl param before sending to the browser
      const uploadURL = rawUploadURL.includes('&__publicUrl=')
        ? rawUploadURL.slice(0, rawUploadURL.indexOf('&__publicUrl='))
        : rawUploadURL;

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log?.error({ err: error }, 'Error generating upload URL');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: `Failed to generate upload URL: ${msg}` });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Proxy / redirect for S3 objects that are stored as full public URLs.
 * For public buckets this simply redirects to the S3 URL; for private
 * buckets it generates a presigned GET URL and redirects.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;

    // If stored path is a full S3 URL, redirect to it (with presigned URL for private buckets)
    if (wildcardPath.startsWith('https://')) {
      const presignedUrl = await objectStorageService.getPresignedGetUrl(wildcardPath);
      res.redirect(302, presignedUrl);
      return;
    }

    res.status(404).json({ error: 'Object not found' });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log?.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
