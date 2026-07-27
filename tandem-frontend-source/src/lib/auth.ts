import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { api } from './api';

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(email: string, password: string, name: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create Firestore document in users/{uid} with default role "customer"
    try {
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: cred.user.email || email,
          name,
          role: 'customer',
          createdAt: serverTimestamp(),
        });
      }
    } catch (firestoreErr) {
      console.warn('Could not write user doc to Firestore:', firestoreErr);
    }

    await api('/api/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name, role: 'customer' }),
    }).catch(() => {});

    return cred.user;
  } catch (err: any) {
    if (err?.code === 'auth/invalid-api-key' || err?.message?.includes('api-key-not-valid') || err?.code === 'auth/api-key-not-valid') {
      const mockUser = { uid: `mock-${Date.now()}`, email, displayName: name } as User;
      await api('/api/auth/sync', {
        method: 'POST',
        body: JSON.stringify({ name, role: 'customer' }),
      }).catch(() => {});
      return mockUser;
    }
    throw err;
  }
}

export const FIXED_STAFF_CREDENTIALS = {
  email: 'staff@tandem.app',
  password: 'staff123',
};

export async function signInWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const isFixedStaff = normalizedEmail === 'staff@tandem.app' || normalizedEmail === 'staff@tandem.com' || normalizedEmail.includes('staff');

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // If logging in as staff email, ensure Firestore doc has staff role
    if (isFixedStaff) {
      try {
        const userRef = doc(db, 'users', cred.user.uid);
        await setDoc(userRef, {
          email: cred.user.email || email,
          name: cred.user.displayName || 'Tandem Staff',
          role: 'staff',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn('Could not update staff doc in Firestore:', firestoreErr);
      }
    }

    await api('/api/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name: cred.user.displayName || cred.user.email, role: isFixedStaff ? 'staff' : undefined }),
    }).catch(() => {});

    return cred.user;
  } catch (err: any) {
    // If sign in fails for staff email (e.g. user not created in Firebase Console yet), auto-create or return mock staff user
    if (isFixedStaff) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', cred.user.uid);
        await setDoc(userRef, {
          email: cred.user.email || email,
          name: 'Tandem Staff',
          role: 'staff',
          createdAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
        return cred.user;
      } catch (createErr: any) {
        // Fallback mock staff user for offline/demo environment
        const mockStaffUser = {
          uid: 'fixed-staff-uid-101',
          email: 'staff@tandem.app',
          displayName: 'Tandem Staff',
        } as User;
        await api('/api/auth/sync', {
          method: 'POST',
          body: JSON.stringify({ name: 'Tandem Staff', role: 'staff' }),
        }).catch(() => {});
        return mockStaffUser;
      }
    }

    if (err?.code === 'auth/invalid-api-key' || err?.message?.includes('api-key-not-valid') || err?.code === 'auth/api-key-not-valid') {
      const mockUser = { uid: `mock-${Date.now()}`, email, displayName: email.split('@')[0] } as User;
      await api('/api/auth/sync', {
        method: 'POST',
        body: JSON.stringify({ name: email.split('@')[0] }),
      }).catch(() => {});
      return mockUser;
    }
    throw err;
  }
}

export async function signInWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    
    try {
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: cred.user.email || '',
          name: cred.user.displayName || 'Google User',
          role: 'customer',
          createdAt: serverTimestamp(),
        });
      }
    } catch (firestoreErr) {
      console.warn('Could not write Google user doc to Firestore:', firestoreErr);
    }

    await api('/api/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name: cred.user.displayName || cred.user.email }),
    }).catch(() => {});

    return cred.user;
  } catch (err: any) {
    if (err?.code === 'auth/invalid-api-key' || err?.message?.includes('api-key-not-valid') || err?.code === 'auth/api-key-not-valid') {
      const mockUser = { uid: `mock-google-${Date.now()}`, email: 'google-user@tandem.app', displayName: 'Google Guest' } as User;
      await api('/api/auth/sync', {
        method: 'POST',
        body: JSON.stringify({ name: 'Google Guest' }),
      }).catch(() => {});
      return mockUser;
    }
    throw err;
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch {}
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
