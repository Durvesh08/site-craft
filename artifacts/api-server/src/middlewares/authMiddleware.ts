import { type NextFunction, type Request, type Response } from 'express';
import { verifyJwt } from '../lib/jwt';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
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

  // 1. Check for token in cookies
  let token = req.cookies?.token;

  // 2. Fallback to Authorization header
  if (!token && req.headers['authorization']?.startsWith('Bearer ')) {
    token = req.headers['authorization'].slice(7);
  }

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyJwt(token);
    if (!decoded) {
      res.clearCookie('token', { path: '/' });
      next();
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    req.log.error(err, 'Error in auth middleware parsing JWT');
    res.clearCookie('token', { path: '/' });
    next();
  }
}
