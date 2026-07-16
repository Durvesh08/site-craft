import crypto from 'crypto';

// Retrieve or derive encryption key (must be exactly 32 bytes/256 bits)
const ENCRYPTION_KEY = (() => {
  const envKey = process.env.SETTINGS_ENCRYPTION_KEY;
  if (envKey) {
    // If provided as hex string, decode it, otherwise hash it to ensure 32 bytes
    if (envKey.length === 64) return Buffer.from(envKey, 'hex');
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Safe stable fallback derived from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || 'default-fallback-key-detailing-ai-engine';
  return crypto.createHash('sha256').update(dbUrl).digest();
})();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:encrypted:tag
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText as any, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
