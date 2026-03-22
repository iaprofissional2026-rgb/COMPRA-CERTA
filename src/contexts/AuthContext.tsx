import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDocFromServer, Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { OperationType, handleFirestoreError } from '../lib/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  appSettings: any | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isFeminine: boolean;
  setIsFeminine: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [appSettings, setAppSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFeminine, setIsFeminine] = useState(false);

  useEffect(() => {
    let unsubProfile: Unsubscribe | null = null;
    let unsubSettings: Unsubscribe | null = null;

    // Listen to global app settings
    unsubSettings = onSnapshot(doc(db, 'app_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data());
      } else {
        // Default settings
        setAppSettings({
          appName: 'Compra Certa',
          appDescription: 'Sua lista de compras premium, rápida e eficiente.',
          appVersion: '1.0.0',
          playStoreUrl: ''
        });
      }
    });

    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error?.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

    // Check for redirect result to catch any errors during the redirect flow
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect sign in error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous profile listener if any
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Listen to user profile
        unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ ...docSnap.data(), uid: user.uid });
            setLoading(false);
          } else {
            // Create initial profile if it doesn't exist
            const isAdminEmail = user.email === 'mizael.org.silva@gmail.com' || user.email === 'viralizaapp33@gmail.com';
            const initialProfile = {
              uid: user.uid,
              email: user.email,
              status: isAdminEmail ? 'approved' : 'new',
              isActive: isAdminEmail,
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: serverTimestamp(),
            };
            setDoc(userDocRef, initialProfile)
              .then(() => {
                setProfile(initialProfile);
                setLoading(false);
              })
              .catch(e => {
                handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
                setLoading(false);
              });
          }
        }, (error) => {
          console.warn('Profile listener error:', error.message);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'mizael.org.silva@gmail.com' || user?.email === 'viralizaapp33@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, appSettings, loading, signIn, logout, isAdmin, isFeminine, setIsFeminine }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
