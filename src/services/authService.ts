import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import type { UserProfile } from '../types/smm';

export const ADMIN_BOOTSTRAP_EMAIL = 'mdsalimkhanbosstr@gmail.com';
const REF_STORAGE_KEY = 'mahirdev_referral_code';

// Prevent concurrent ensureUserProfile race condition between auth handlers & onAuthStateChanged
const inFlightProfiles = new Map<string, Promise<UserProfile>>();

export function captureReferralFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && /^[a-zA-Z0-9_\-]{4,32}$/.test(ref.trim())) {
      localStorage.setItem(REF_STORAGE_KEY, ref.trim().toUpperCase());
    }
  } catch {
    // ignore storage access issues
  }
}

export function getSavedReferralCode(): string {
  try {
    return localStorage.getItem(REF_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function clearSavedReferralCode(): void {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function verifyAdminRole(user: User): Promise<boolean> {
  if (user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL && user.emailVerified) {
    return true;
  }
  const path = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

async function createOrFetchUserProfile(user: User, preferredName?: string): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  let existingSnap;
  try {
    existingSnap = await getDoc(doc(db, 'users', user.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap.exists()) {
    return existingSnap.data() as UserProfile;
  }

  const cleanUidPart =
    user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'USER01';
  const referralCode = `MHR${cleanUidPart}`;

  let referredByUid = '';
  const savedCode = getSavedReferralCode();
  if (savedCode && savedCode !== referralCode) {
    try {
      const refCodeSnap = await getDoc(doc(db, 'referralCodes', savedCode));
      if (refCodeSnap.exists()) {
        const refData = refCodeSnap.data() as { ownerUid?: string };
        if (refData.ownerUid && refData.ownerUid !== user.uid) {
          referredByUid = refData.ownerUid;
        }
      }
    } catch {
      // ignore invalid referral code lookup
    }
  }

  const displayName = (
    preferredName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'MAHIR DEV User'
  ).slice(0, 80);

  const newProfile = {
    uid: user.uid,
    displayName,
    email: user.email || '',
    photoURL: (user.photoURL || '').slice(0, 512),
    walletBalance: 0,
    totalDeposits: 0,
    totalSpending: 0,
    accountStatus: 'active' as const,
    membershipLevel: 'standard' as const,
    referralCode,
    referredBy: referredByUid,
    referralCount: 0,
    referralEarnings: 0,
    language: 'en' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', user.uid), newProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  // Safely create referral code index only if it doesn't exist yet
  try {
    const codeRef = doc(db, 'referralCodes', referralCode);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) {
      await setDoc(codeRef, {
        code: referralCode,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch {
    // Do not block sign-up if referral index creation collides
  }

  if (referredByUid) {
    try {
      const refDocRef = doc(db, 'referrals', user.uid);
      const refDocSnap = await getDoc(refDocRef);
      if (!refDocSnap.exists()) {
        await setDoc(refDocRef, {
          id: user.uid,
          referrerUid: referredByUid,
          referredUid: user.uid,
          referredEmail: user.email || '',
          rewardAmount: 0,
          status: 'registered',
          createdAt: serverTimestamp(),
        });
      }
      clearSavedReferralCode();
    } catch {
      // Do not fail profile creation if referral attribution fails
    }
  }

  try {
    const createdSnap = await getDoc(doc(db, 'users', user.uid));
    return createdSnap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function ensureUserProfile(user: User, preferredName?: string): Promise<UserProfile> {
  const existingPromise = inFlightProfiles.get(user.uid);
  if (existingPromise) {
    return existingPromise;
  }
  const promise = createOrFetchUserProfile(user, preferredName).finally(() => {
    inFlightProfiles.delete(user.uid);
  });
  inFlightProfiles.set(user.uid, promise);
  return promise;
}

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(result.user);
    return result.user;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/popup-blocked')) {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('Popup was blocked by browser — redirecting to Google Sign-In...');
    }
    throw err;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(result.user, { displayName: name.trim().slice(0, 80) });
  }
  try {
    await sendEmailVerification(result.user);
  } catch {
    // verification email may be rate-limited; proceed safely
  }
  await ensureUserProfile(result.user, name.trim());
  return result.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
