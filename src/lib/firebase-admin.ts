import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let projectId: string | undefined = process.env.GOOGLE_CLOUD_PROJECT;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
      projectId?: string;
    };
    projectId = parsed.projectId || projectId;
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

if (!getApps().length) {
  initializeApp(projectId ? { projectId } : undefined);
}

export const adminAuth = getAuth();
