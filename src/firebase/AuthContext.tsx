import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db, googleProvider } from './config';
import { BranchProfile, AppRole } from '../types';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyId: string;
  role?: AppRole;
  createdAt?: any;
}

export interface CompanyData extends BranchProfile {
  inviteCode: string;
  ownerId: string;
  createdAt?: any;
  branches?: BranchProfile[];
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  company: CompanyData | null;
  currentRole: AppRole;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  registerCompany: (userData: { name: string; email: string; pass: string }, compData: Partial<CompanyData>) => Promise<void>;
  joinCompanyWithCode: (userData: { name: string; email: string; pass: string }, inviteCode: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchCompanyCode: (inviteCode: string) => Promise<void>;
  switchRole: (role: AppRole) => Promise<void>;
  updateCompany: (updates: Partial<CompanyData>) => Promise<void>;
  refreshCompanyData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate 6-character random alphanumeric studio join code (e.g. AL-8429)
export const generateInviteCode = (prefix = 'AL') => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix.toUpperCase()}-${random}`;
};

const DEFAULT_STUDIO_COMPANY: CompanyData = {
  id: 'comp_artelume_main',
  name: 'ARTÈ LUME',
  tagline: 'Architectural Lighting Studio',
  location: 'Jubilee Hills • Hyderabad',
  address: 'Plot No. 1345, Road No. 68, Jubilee Hills, Hyderabad - 500033',
  gstin: '36AAACN4010N1ZW',
  email: 'artelume3017@gmail.com',
  phone: '+91 98490 12345',
  quotePrefix: 'AL',
  inviteCode: 'AL-STUDIO',
  ownerId: 'local_studio_user',
  theme: {
    primaryColor: '#7b3f22',
    accentColor: '#df9c20',
    excelBannerColor: 'FF7B3F22',
    excelAccentColor: 'FFDF9C20'
  },
  bankDetails: {
    accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD',
    accNo: '98765432109876',
    bankName: 'HDFC BANK',
    ifsc: 'HDFC0001234',
    branch: 'JUBILEE HILLS, HYDERABAD'
  }
};

const DEFAULT_STUDIO_PROFILE: UserProfile = {
  uid: 'local_studio_user',
  email: 'artelume3017@gmail.com',
  displayName: 'Artè Lume Studio',
  companyId: 'comp_artelume_main',
  role: 'member'
};

const getCachedUser = (): any => {
  try {
    const raw = localStorage.getItem('artelume_cached_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    uid: 'local_studio_user',
    email: 'artelume3017@gmail.com',
    displayName: 'Artè Lume Studio'
  };
};

const getCachedProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem('artelume_cached_profile');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_STUDIO_PROFILE;
};

const getCachedCompany = (): CompanyData => {
  try {
    const raw = localStorage.getItem('artelume_cached_company');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_STUDIO_COMPANY;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getCachedProfile());
  const [company, setCompany] = useState<CompanyData | null>(() => getCachedCompany());
  const [loading, setLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<AppRole>(() => {
    try {
      const saved = localStorage.getItem('artelume_active_role');
      if (saved && ['owner', 'admin', 'sales', 'delivery'].includes(saved)) {
        return saved as AppRole;
      }
      const prof = getCachedProfile();
      if (prof.role && ['owner', 'admin', 'sales', 'delivery'].includes(prof.role)) {
        return prof.role as AppRole;
      }
    } catch {}
    return 'owner';
  });

  const switchRole = async (newRole: AppRole) => {
    setCurrentRole(newRole);
    try {
      localStorage.setItem('artelume_active_role', newRole);
      setUserProfile(prev => prev ? ({ ...prev, role: newRole }) : null);
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { role: newRole }).catch(() => {});
      }
    } catch (e) {
      console.warn('Role switch local update only:', e);
    }
  };

  // Load User Profile and Company Data from Firestore (with immediate LocalStorage persistence)
  const loadUserAndCompany = async (authUser: User) => {
    try {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);

      let uData: UserProfile;

      if (userSnap.exists()) {
        const raw = userSnap.data();
        const rawRole = raw.role;
        const normalizedRole: AppRole = (rawRole && ['owner', 'admin', 'sales', 'delivery'].includes(rawRole)) ? (rawRole as AppRole) : 'owner';
        uData = {
          uid: authUser.uid,
          email: raw.email || authUser.email || '',
          displayName: raw.displayName || authUser.displayName || authUser.email?.split('@')[0] || 'Studio Member',
          companyId: raw.companyId || 'comp_artelume_main',
          role: normalizedRole,
          createdAt: raw.createdAt
        };
      } else {
        uData = {
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Studio Member',
          companyId: 'comp_artelume_main',
          role: 'owner',
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(userRef, uData, { merge: true });
        } catch (e) {
          // Silent when offline
        }
      }

      setUserProfile(uData);
      try {
        localStorage.setItem('artelume_cached_profile', JSON.stringify(uData));
        localStorage.setItem('artelume_cached_user', JSON.stringify({
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || uData.displayName
        }));
      } catch (e) {}

      // Now ensure Company Data is loaded
      const targetCompanyId = uData.companyId || 'comp_artelume_main';
      const compRef = doc(db, 'companies', targetCompanyId);
      const compSnap = await getDoc(compRef);

      let activeComp: CompanyData;
      if (compSnap.exists()) {
        activeComp = { id: compSnap.id, ...compSnap.data() } as CompanyData;
      } else {
        const legacyRef = doc(db, 'companies', 'artelume');
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          activeComp = { id: legacySnap.id, ...legacySnap.data() } as CompanyData;
        } else {
          activeComp = { ...DEFAULT_STUDIO_COMPANY, id: targetCompanyId, ownerId: authUser.uid };
          try {
            await setDoc(compRef, activeComp, { merge: true });
          } catch (e) {}
        }
      }
      setCompany(activeComp);
      try {
        localStorage.setItem('artelume_cached_company', JSON.stringify(activeComp));
      } catch (e) {}
    } catch (err: any) {
      // Offline fallback: keep existing or cached company/profile without logging errors
      const fallbackProfile = getCachedProfile();
      const fallbackCompany = getCachedCompany();
      setUserProfile(fallbackProfile);
      setCompany(fallbackCompany);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserAndCompany(currentUser);
      } else {
        // Maintain local storage session so app works seamlessly offline
        const cachedUser = getCachedUser();
        const cachedCompany = getCachedCompany();
        const cachedProfile = getCachedProfile();
        setUser(cachedUser);
        setUserProfile(cachedProfile);
        setCompany(cachedCompany);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Sign In Existing Staff / User
  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await loadUserAndCompany(cred.user);
    } finally {
      setLoading(false);
    }
  };

  // 2. Register New Organization & Studio Owner
  const registerCompany = async (
    userData: { name: string; email: string; pass: string },
    compData: Partial<CompanyData>
  ) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, userData.email.trim(), userData.pass);
      await updateProfile(cred.user, { displayName: userData.name.trim() });

      const compPrefix = (compData.quotePrefix || 'AL').toUpperCase().trim();
      const companyId = `comp_${Date.now()}`;
      const inviteCode = generateInviteCode(compPrefix);

      const newCompany: CompanyData = {
        id: companyId,
        name: compData.name?.trim() || 'ARTÈ LUME',
        tagline: compData.tagline?.trim() || 'Architectural Lighting Studio',
        location: compData.location?.trim() || 'Jubilee Hills • Hyderabad',
        address: compData.address?.trim() || 'Plot No. 1345, Road No. 68, Jubilee Hills, Hyderabad - 500033',
        gstin: compData.gstin?.trim() || '36AAACN4010N1ZW',
        email: compData.email?.trim() || userData.email.trim(),
        phone: compData.phone?.trim() || '+91 98490 12345',
        quotePrefix: compPrefix,
        inviteCode,
        ownerId: cred.user.uid,
        createdAt: serverTimestamp(),
        theme: {
          primaryColor: compData.theme?.primaryColor || '#7b3f22',
          accentColor: compData.theme?.accentColor || '#df9c20',
          excelBannerColor: compData.theme?.excelBannerColor || 'FF7B3F22',
          excelAccentColor: compData.theme?.excelAccentColor || 'FFDF9C20'
        },
        bankDetails: compData.bankDetails || {
          accName: `${compData.name?.trim() || 'ARTÈ LUME'} LIGHTING STUDIO PVT LTD`,
          accNo: '98765432109876',
          bankName: 'HDFC BANK',
          ifsc: 'HDFC0001234',
          branch: compData.location?.split('•')[0]?.trim() || 'HYDERABAD'
        }
      };

      // Create company record
      await setDoc(doc(db, 'companies', companyId), newCompany);

      // Create invites lookup document for team code matching
      await setDoc(doc(db, 'invites', inviteCode.toUpperCase()), {
        companyId,
        companyName: newCompany.name,
        createdBy: cred.user.uid,
        createdAt: serverTimestamp()
      });

      // Create user profile
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: userData.email.trim(),
        displayName: userData.name.trim(),
        companyId,
        role: 'owner',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);

      setUserProfile(newProfile);
      setCompany(newCompany);
    } finally {
      setLoading(false);
    }
  };

  // 3. Join Existing Company via Invite Code (Multi-Device access)
  const joinCompanyWithCode = async (
    userData: { name: string; email: string; pass: string },
    inviteCode: string
  ) => {
    setLoading(true);
    try {
      const codeClean = inviteCode.trim().toUpperCase();
      const inviteRef = doc(db, 'invites', codeClean);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error(`Invalid Studio Invite Code "${codeClean}". Please check with your studio owner.`);
      }

      const { companyId } = inviteSnap.data() as { companyId: string };
      const compRef = doc(db, 'companies', companyId);
      const compSnap = await getDoc(compRef);

      if (!compSnap.exists()) {
        throw new Error('Organization not found. It may have been relocated.');
      }

      const cred = await createUserWithEmailAndPassword(auth, userData.email.trim(), userData.pass);
      await updateProfile(cred.user, { displayName: userData.name.trim() });

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: userData.email.trim(),
        displayName: userData.name.trim(),
        companyId,
        role: 'staff',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setUserProfile(newProfile);
      setCompany({ id: compSnap.id, ...compSnap.data() } as CompanyData);
    } finally {
      setLoading(false);
    }
  };

  // 4. Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', cred.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // If first-time Google sign-in, assign to default Artè Lume company or create initial
        const defaultCompanyId = 'comp_artelume_main';
        const compRef = doc(db, 'companies', defaultCompanyId);
        const compSnap = await getDoc(compRef);

        let activeComp: CompanyData;
        if (!compSnap.exists()) {
          const inviteCode = generateInviteCode('AL');
          activeComp = {
            id: defaultCompanyId,
            name: 'ARTÈ LUME',
            tagline: 'Architectural Lighting Studio',
            location: 'Jubilee Hills • Hyderabad',
            address: 'Plot No. 1345, Road No. 68, Jubilee Hills, Hyderabad - 500033',
            gstin: '36AAACN4010N1ZW',
            email: cred.user.email || 'contact@artelume.com',
            phone: '+91 98490 12345',
            quotePrefix: 'AL',
            inviteCode,
            ownerId: cred.user.uid,
            createdAt: serverTimestamp(),
            theme: {
              primaryColor: '#7b3f22',
              accentColor: '#df9c20',
              excelBannerColor: 'FF7B3F22',
              excelAccentColor: 'FFDF9C20'
            },
            bankDetails: {
              accName: 'ARTÈ LUME LIGHTING STUDIO PVT LTD',
              accNo: '98765432109876',
              bankName: 'HDFC BANK',
              ifsc: 'HDFC0001234',
              branch: 'JUBILEE HILLS, HYDERABAD'
            }
          };
          await setDoc(compRef, activeComp);
          await setDoc(doc(db, 'invites', inviteCode), {
            companyId: defaultCompanyId,
            companyName: 'ARTÈ LUME',
            createdBy: cred.user.uid,
            createdAt: serverTimestamp()
          });
        } else {
          activeComp = { id: compSnap.id, ...compSnap.data() } as CompanyData;
        }

        const profile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'Architectural Consultant',
          companyId: defaultCompanyId,
          role: compSnap.exists() ? 'staff' : 'owner',
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, profile);
        setUserProfile(profile);
        setCompany(activeComp);
      } else {
        await loadUserAndCompany(cred.user);
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. Sign Out
  const signOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out notice:', e);
    } finally {
      setUser(getCachedUser());
      setUserProfile(getCachedProfile());
      setCompany(getCachedCompany());
      setLoading(false);
    }
  };

  // 6. Reset Password Email
  const resetPassword = async (email: string) => {
    if (!email.trim()) throw new Error('Please enter your email address.');
    await sendPasswordResetEmail(auth, email.trim());
  };

  // 7. Switch Company / Join Team with Code for already authenticated user
  const switchCompanyCode = async (inviteCode: string) => {
    if (!user) throw new Error('You must be signed in to switch organization.');
    setLoading(true);
    try {
      const codeClean = inviteCode.trim().toUpperCase();
      const inviteRef = doc(db, 'invites', codeClean);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error(`Invalid Studio Invite Code "${codeClean}".`);
      }

      const { companyId } = inviteSnap.data() as { companyId: string };
      const compRef = doc(db, 'companies', companyId);
      const compSnap = await getDoc(compRef);

      if (!compSnap.exists()) {
        throw new Error('Organization not found.');
      }

      // Update user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        companyId,
        role: 'staff'
      });

      // Reload state
      await loadUserAndCompany(user);
    } finally {
      setLoading(false);
    }
  };

  // 8. Update Company Profile (Settings)
  const updateCompany = async (updates: Partial<CompanyData>) => {
    if (!company) return;
    try {
      const compRef = doc(db, 'companies', company.id);
      await updateDoc(compRef, updates);
      setCompany(prev => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      console.error('Failed to update company:', err);
      throw err;
    }
  };

  const refreshCompanyData = async () => {
    if (user) {
      await loadUserAndCompany(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        company,
        currentRole,
        loading,
        signIn,
        registerCompany,
        joinCompanyWithCode,
        signInWithGoogle,
        signOut,
        resetPassword,
        switchCompanyCode,
        switchRole,
        updateCompany,
        refreshCompanyData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
