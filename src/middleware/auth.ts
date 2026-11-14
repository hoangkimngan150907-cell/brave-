import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';
import { verifyFirebaseIdToken } from '../lib/firebase-admin.ts';

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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Unauthorized: Missing Authorization Bearer token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res
      .status(401)
      .json({ error: 'Unauthorized: Empty Authorization Bearer token' });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(token);
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
    const message = error instanceof Error ? error.message : 'Invalid token';
    if (message.includes('Service Account credentials') || message.includes('not initialized')) {
      console.error('Firebase Admin configuration error:', message);
      return res.status(503).json({
        error: 'Authentication service is not configured with Firebase Admin credentials.',
      });
    }
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase token' });
  }
};
