import fs from 'fs';
import path from 'path';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

interface RawServiceAccount {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function resolveProjectId(): string | undefined {
  let projectId: string | undefined =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim();

  if (!projectId) {
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
          projectId?: string;
        };
        projectId = parsed.projectId;
      }
    } catch (err) {
      console.warn('Could not read firebase-applet-config.json:', err);
    }
  }
  return projectId;
}

function parseServiceAccountFromEnv(): (ServiceAccount & { project_id?: string }) | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    let jsonStr = raw;
    if (!jsonStr.startsWith('{')) {
      try {
        jsonStr = Buffer.from(raw, 'base64').toString('utf8');
      } catch {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT_JSON is neither valid JSON nor valid base64 JSON.'
        );
      }
    }

    let parsed: RawServiceAccount;
    try {
      parsed = JSON.parse(jsonStr) as RawServiceAccount;
    } catch (err) {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${(err as Error).message}`
      );
    }

    const privateKey = parsed.private_key?.replace(/\\n/g, '\n');
    if (!parsed.client_email || !privateKey || !parsed.project_id) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON must contain project_id, client_email, and private_key.'
      );
    }

    return {
      projectId: parsed.project_id,
      project_id: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey,
    };
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, '\n');
  const projectId = resolveProjectId();
  if (clientEmail && privateKey && projectId) {
    return {
      projectId,
      project_id: projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

const projectId = resolveProjectId();
const serviceAccount = parseServiceAccountFromEnv();
const isCloudRunRuntime = Boolean(process.env.K_SERVICE);
const hasGac = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());

export const hasFirebaseAdminCredentials = Boolean(
  serviceAccount || hasGac || (isCloudRunRuntime && projectId)
);

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });
  } else if (hasGac || (projectId && (isCloudRunRuntime || process.env.NODE_ENV !== 'production'))) {
    initializeApp(projectId ? { projectId } : undefined);
  } else {
    console.error(
      '[SECURITY] Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON on Render.'
    );
  }
}

export function getAdminAuth() {
  if (!getApps().length) {
    throw new Error(
      'Firebase Admin SDK is not initialized: missing FIREBASE_SERVICE_ACCOUNT_JSON credentials.'
    );
  }
  return getAuth();
}

export async function verifyFirebaseIdToken(token: string): Promise<DecodedIdToken> {
  if (!token || !token.trim()) {
    throw new Error('Missing Firebase ID token.');
  }

  const requireStrictServiceAccount =
    process.env.RENDER === 'true' ||
    (process.env.NODE_ENV === 'production' && !isCloudRunRuntime);

  if (requireStrictServiceAccount && !serviceAccount && !hasGac) {
    throw new Error(
      'Firebase Admin Service Account credentials (FIREBASE_SERVICE_ACCOUNT_JSON) are required in production.'
    );
  }

  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(token);
  if (!decoded?.uid) {
    throw new Error('Verified Firebase token is missing uid.');
  }
  return decoded;
}

export const adminAuth = getApps().length ? getAuth() : null;
