import type { AuthUser } from '@workspace/api-zod';
import { type NextFunction, type Request, type Response } from 'express';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

import {
  clearSession,
  getSession,
  getSessionId,
  type SessionData,
} from '../lib/auth';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    }

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request['isAuthenticated'];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  try {
    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.user.id))
      .limit(1);

    if (!dbUser) {
      await clearSession(res, sid);
      next();
      return;
    }

    req.user = dbUser;
    next();
  } catch (err) {
    req.log.error(err, 'Error in auth middleware fetching user');
    next();
  }
}
