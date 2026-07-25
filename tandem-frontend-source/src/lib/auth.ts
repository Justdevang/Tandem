import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { api } from './api';

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(email: string, password: string, name: string, role: 'customer' | 'staff' = 'customer') {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Sync user to our backend
  await api('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({ name, role }),
  });
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  // Sync user to our backend
  await api('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({ name: cred.user.displayName || cred.user.email }),
  });
  return cred.user;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  // Sync user to our backend
  await api('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({ name: cred.user.displayName || cred.user.email }),
  });
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
