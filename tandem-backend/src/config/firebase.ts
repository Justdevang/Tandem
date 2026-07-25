import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('🔐 Firebase Admin SDK initialized');
} else {
  // If no service account file, try initializing with env vars or skip
  console.warn('⚠️  Firebase service account not found at:', serviceAccountPath);
  console.warn('   Auth routes will not work until you provide the service account.');
  // Initialize with no credential so the app doesn't crash
  try {
    admin.initializeApp();
  } catch {
    // Already initialized or can't initialize — that's okay for local dev
  }
}

export default admin;
