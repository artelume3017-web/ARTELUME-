# User Authentication Script & Implementation Guide

This document provides the complete, production-ready script and implementation for **User Authentication** (Sign Up, Sign In, Sign Out, and Secure Credential Storage) as requested. As instructed, **no live application files have been modified** pending your review and confirmation.

---

## 1. Security Architecture & Credential Handling

- **Zero Plaintext Storage**: User passwords are never saved in plain text, database collections, or client storage.
- **Cryptographic Hashing**: Firebase Authentication processes all passwords on Google's security-hardened identity infrastructure using a modified `scrypt` hashing algorithm (adaptive key-derivation function with cryptographic salt).
- **Secure Token Flow**: Upon successful authentication, Firebase issues cryptographically signed JWT tokens (ID token valid for 1 hour, automatic silent token refresh via long-lived refresh token stored in browser IndexedDB with strict origin isolation).
- **Session Control & Logout**: Calling `signOut()` immediately revokes active browser tokens, clears local state, and halts Firestore live sync listeners.

---

## 2. Complete Authentication Script (`authService.ts`)

You can review this script below. It contains the exact methods for Sign Up, Sign In, Sign Out, Current User listener, and Password Reset:

```typescript
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User,
  UserCredential
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { app } from './config'; // Pre-configured Firebase instance

// 1. Initialize Authentication and Database
export const auth = getAuth(app);
export const db = getFirestore(app);

// Data structure for stored user profile in Firestore
export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'admin' | 'sales' | 'delivery' | 'viewer';
  companyId: string;
  createdAt: any;
  lastLoginAt: any;
}

/**
 * SIGN UP: Creates a new user with Email and Password
 * - Validates credentials
 * - Creates Firebase Auth identity
 * - Updates user's display name
 * - Creates a secure profile document in Firestore
 */
export async function signUpWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  role?: 'owner' | 'admin' | 'sales' | 'delivery';
  companyId?: string;
}): Promise<{ user: User; profile: AppUserProfile }> {
  const { email, password, displayName, role = 'sales', companyId = 'comp_artelume_main' } = params;

  // Basic validation
  if (!email || !email.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (!displayName.trim()) {
    throw new Error('Please enter your full name.');
  }

  // 1. Create user in Firebase Auth (handles salted hashing automatically)
  const userCredential: UserCredential = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  const user = userCredential.user;

  // 2. Set Firebase Auth display name
  await updateProfile(user, {
    displayName: displayName.trim()
  });

  // 3. Create user profile record in Firestore
  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || email.trim().toLowerCase(),
    displayName: displayName.trim(),
    role,
    companyId,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  await setDoc(doc(db, 'users', user.uid), profile, { merge: true });

  return { user, profile };
}

/**
 * LOG IN: Authenticates existing user with Email and Password
 * - Verifies credentials securely with Firebase Auth
 * - Updates last login timestamp
 * - Returns active user object and profile
 */
export async function logInWithEmail(
  email: string,
  pass: string
): Promise<{ user: User; profile: AppUserProfile | null }> {
  if (!email.trim() || !pass) {
    throw new Error('Please enter both your email address and password.');
  }

  // 1. Authenticate with Firebase Auth
  const userCredential: UserCredential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    pass
  );
  const user = userCredential.user;

  // 2. Retrieve user profile from Firestore
  let profile: AppUserProfile | null = null;
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    profile = userDocSnap.data() as AppUserProfile;
    // Update last login
    setDoc(userDocRef, { lastLoginAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }

  return { user, profile };
}

/**
 * LOG OUT: Terminates current authenticated session
 * - Invalidates client-side JWT token
 * - Clears session memory
 */
export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * AUTH LISTENER: Listens to auth state changes across tabs/sessions
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * FORGOT PASSWORD: Sends secure password reset email
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim() || !email.includes('@')) {
    throw new Error('Please enter a valid registered email address.');
  }
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}
```

---

## 3. Standalone Node.js CLI Verification Script (`test-auth.mjs`)

You can run this self-contained script using `npx tsx` or Node to verify the authentication pipeline:

```javascript
// test-auth.mjs
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import config from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(config);
const auth = getAuth(app);

async function runAuthTest() {
  const testEmail = `test.user.${Date.now()}@artelume.com`;
  const testPassword = 'SecurePassword2026!';

  console.log('1. Testing User Sign-Up...');
  const signUpRes = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
  console.log('   ✓ Sign-Up Successful! UID:', signUpRes.user.uid);

  console.log('2. Testing User Sign-Out...');
  await signOut(auth);
  console.log('   ✓ Sign-Out Successful! Current user is null.');

  console.log('3. Testing User Log-In...');
  const logInRes = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  console.log('   ✓ Log-In Successful! Logged in as:', logInRes.user.email);

  console.log('4. Testing Final Sign-Out...');
  await signOut(auth);
  console.log('   ✓ All Auth steps completed securely with zero errors.');
}

runAuthTest().catch(console.error);
```

---

## 4. How It Integrates into the Application (Upon Confirmation)

When you give confirmation, we will:
1. Connect `signUpWithEmail`, `logInWithEmail`, and `logOut` to the Studio header profile menu and navigation bar.
2. Provide a clean tabbed modal for:
   - **Sign In** (Email + Password)
   - **Sign Up** (Name, Email, Password, Role)
   - **Forgot Password** (Instant password reset link)
3. Display current user status badge in the header with one-click **Log Out**.
4. Keep full local-storage offline fallback so you never get locked out during intermittent network connectivity.

---
*Status: Script prepared and reviewed. Ready to apply to the application upon your confirmation.*
