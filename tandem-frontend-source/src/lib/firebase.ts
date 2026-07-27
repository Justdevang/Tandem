import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase config with safe fallback values to prevent blank page crash on Render
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeySafeFallback123456789',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tandem-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tandem-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tandem-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:demo123456',
};

let app: ReturnType<typeof initializeApp>;
try {
  app = initializeApp(firebaseConfig);
} catch {
  // Graceful fallback if firebase fails
  app = initializeApp(firebaseConfig, 'fallback-app');
}

export const auth = getAuth(app);
export default app;
