/**
 * Shared FTP connection helper.
 *
 * Handles:
 *  - Stripping ftp:// / ftps:// protocol prefixes from the host.
 *  - Forcing secure=true when the prefix was ftps://.
 *  - Auto-retry with FTPS (secure: true + rejectUnauthorized: false) when a
 *    plain-FTP connect is rejected with a 530 "Login incorrect" / "Not logged in"
 *    response — Hostinger and many other hosts require FTPS and refuse plain-text
 *    auth on port 21 with a 530.
 *  - Self-signed certificate tolerance (rejectUnauthorized: false), which is
 *    the norm on shared hosting FTPS endpoints.
 */

import * as ftp from "basic-ftp";

export interface FtpCredentials {
  host: string;
  port?: number;
  user: string;
  password: string;
  /** Caller hint — may be overridden by the prefix detected in host or by
   *  the auto-FTPS-retry logic. */
  secure?: boolean;
}

/** Strip protocol prefix from host and return the clean hostname + whether
 *  the caller explicitly requested FTPS via the ftps:// prefix. */
function parseHost(raw: string): { host: string; prefixSecure: boolean } {
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith("ftps://")) {
    return { host: raw.trim().slice(7), prefixSecure: true };
  }
  if (lower.startsWith("ftp://")) {
    return { host: raw.trim().slice(6), prefixSecure: false };
  }
  return { host: raw.trim(), prefixSecure: false };
}

export interface ConnectedClient {
  client: ftp.Client;
  usedSecure: boolean;
}

/**
 * Connect an FTP client, auto-retrying with FTPS on 530.
 * The caller is responsible for calling `client.close()` when done.
 */
export async function ftpConnect(
  creds: FtpCredentials,
  logger?: { info: (msg: string) => void; error: (msg: string) => void },
): Promise<ConnectedClient> {
  const { host: cleanHost, prefixSecure } = parseHost(creds.host);
  const port = creds.port ?? 21;
  // Use secure if: prefix was ftps://, OR caller passed secure=true
  const preferSecure = prefixSecure || creds.secure === true;

  const log = {
    info: logger?.info ?? ((m: string) => console.log("[ftpConnect]", m)),
    error: logger?.error ?? ((m: string) => console.error("[ftpConnect]", m)),
  };

  async function attempt(secure: boolean): Promise<ftp.Client> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    const accessOpts: ftp.AccessOptions = {
      host: cleanHost,
      port,
      user: creds.user,
      password: creds.password,
      secure,
      ...(secure
        ? { secureOptions: { rejectUnauthorized: false } }
        : {}),
    };

    log.info(
      `Connecting to ${cleanHost}:${port} secure=${secure} user=${creds.user}`,
    );

    await client.access(accessOpts);
    return client;
  }

  // First attempt
  try {
    const client = await attempt(preferSecure);
    log.info(`Connected (secure=${preferSecure})`);
    return { client, usedSecure: preferSecure };
  } catch (err: any) {
    const msg: string = err?.message ?? "";
    const code: number = err?.code ?? 0;

    // 530 = server rejected plain-text auth; retry with FTPS if we haven't yet
    const is530 = code === 530 || msg.includes("530") || msg.toLowerCase().includes("login incorrect") || msg.toLowerCase().includes("not logged in");

    if (!preferSecure && is530) {
      log.info(`Plain FTP got 530 — retrying with FTPS (TLS)...`);
      try {
        const client = await attempt(true);
        log.info(`Connected via FTPS after auto-retry`);
        return { client, usedSecure: true };
      } catch (tlsErr: any) {
        log.error(`FTPS retry also failed: ${tlsErr?.message}`);
        throw tlsErr;
      }
    }

    // Any other error (ENOTFOUND, wrong password, etc.) — re-throw as-is
    throw err;
  }
}
