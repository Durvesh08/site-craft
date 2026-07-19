import {
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  GetCurrentAuthUserResponse,
  LogoutMobileSessionResponse,
} from '@workspace/api-zod';
import { db, usersTable } from '@workspace/db';
import { Router, type IRouter, type Request, type Response } from 'express';
import * as oidc from 'openid-client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import {
  clearSession,
  createSession,
  deleteSession,
  getOidcConfig,
  getSessionId,
  ISSUER_URL,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from '../lib/auth';

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host =
    req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  // SameSite=None + Secure=true is required so the session cookie is sent
  // inside cross-site iframes (e.g. Replit's preview pane, embedded widgets).
  // SameSite=Lax silently blocks cookies when the top-level context differs
  // from the cookie's origin, which breaks login in Replit's preview frame.
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,           // required by all browsers when SameSite=None
    sameSite: 'none',       // allows cookie in cross-site iframe contexts
    path: '/',
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return '/';
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const email = (claims.email as string) || null;
  const userData = {
    id: claims.sub as string,
    email: email,
    firstName: (claims.first_name as string) || (claims.given_name as string) || null,
    lastName: (claims.last_name as string) || (claims.family_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get('/auth/user', (req: Request, res: Response) => {
  // Never cache — the browser must not replay a stale {"user":null} response
  // after login (304 from a cached unauthenticated response breaks auth flow).
  res.setHeader('Cache-Control', 'no-store');
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

// Local Register
const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { email, password, firstName, lastName } = parsed.data;

    // Check if user already exists
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [dbUser] = await db.insert(usersTable).values({
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
    }).returning();

    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
      },
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.status(201).json({ user: sessionData.user });
  } catch (err) {
    req.log.error(err, 'Local registration error');
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Local Login
const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { email, password } = parsed.data;

    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!dbUser || !dbUser.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, dbUser.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
      },
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.json({ user: sessionData.user });
  } catch (err) {
    req.log.error(err, 'Local login error');
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.get('/login', async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;
    const returnTo = getSafeReturnTo(req.query.returnTo);

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    setOidcCookie(res, 'code_verifier', codeVerifier);
    setOidcCookie(res, 'nonce', nonce);
    setOidcCookie(res, 'state', state);
    setOidcCookie(res, 'return_to', returnTo);

    res.redirect(redirectTo.href);
  } catch (err) {
    req.log.error(err, 'Failed to build OIDC URL. Google OAuth not configured? redirecting to login page.');
    res.redirect('/login?error=oauth_not_configured');
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect('/api/login');
    return;
  }

  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    const config = await getOidcConfig();
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch (err) {
    req.log.error(err, 'OIDC authorization code grant callback error');
    res.redirect('/api/login');
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie('code_verifier', { path: '/' });
  res.clearCookie('nonce', { path: '/' });
  res.clearCookie('state', { path: '/' });
  res.clearCookie('return_to', { path: '/' });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect('/api/login');
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get('/logout', async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  const returnTo = getSafeReturnTo(req.query.returnTo);
  res.redirect(returnTo);
});

router.post(
  '/mobile-auth/token-exchange',
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required parameters' });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

    try {
      const config = await getOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set('code', code);
      callbackUrl.searchParams.set('state', state);
      callbackUrl.searchParams.set('iss', ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: 'No claims in ID token' });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      res.status(500).json({ error: 'Token exchange failed' });
    }
  },
);

router.post('/mobile-auth/logout', async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
