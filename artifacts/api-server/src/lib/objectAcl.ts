/**
 * Object ACL helpers — simplified stub for S3-backed storage.
 *
 * With S3 + public-read bucket policy, images are always publicly readable.
 * The permission enum is kept for API compatibility with the storage route.
 */

export enum ObjectPermission {
  READ = 'read',
  WRITE = 'write',
}

export interface ObjectAclPolicy {
  visibility: 'public' | 'private';
  owner?: string;
}

// No-op for S3 — bucket policy handles visibility.
export async function setObjectAclPolicy(
  _objectPath: string,
  _policy: ObjectAclPolicy,
): Promise<void> {}

export async function canAccessObject({
  userId: _userId,
  objectPath: _objectPath,
  requestedPermission,
}: {
  userId?: string;
  objectPath: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // Public read is always allowed; write requires authentication (handled at route level).
  return requestedPermission === ObjectPermission.READ;
}
