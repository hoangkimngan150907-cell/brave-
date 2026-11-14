import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const runtimeAuthDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  (typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('.web.app') ||
    window.location.hostname.endsWith('.firebaseapp.com'))
    ? window.location.hostname
    : firebaseConfig.authDomain);

const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: runtimeAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

const app = initializeApp(resolvedConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
