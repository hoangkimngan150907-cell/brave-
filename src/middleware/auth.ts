import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { getOrCreateUser } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  extractCookie,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '../server/auth.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUserId?: number;
  authUid?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      req.authUid = decodedToken.uid;
      const dbUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || `${decodedToken.uid}@brave.app`,
        decodedToken.name,
        decodedToken.picture
      );
      req.dbUserId = dbUser.id;
      return next();
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  const sessionCookie = extractCookie(req, SESSION_COOKIE_NAME);
  if (sessionCookie) {
    const verified = verifySessionToken(sessionCookie);
    if (verified) {
      const [dbUser] = await db
        .select({ id: users.id, uid: users.uid })
        .from(users)
        .where(eq(users.id, verified.userId))
        .limit(1);
      if (dbUser && dbUser.uid === verified.uid) {
        req.dbUserId = dbUser.id;
        req.authUid = dbUser.uid;
        return next();
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid session' });
};
