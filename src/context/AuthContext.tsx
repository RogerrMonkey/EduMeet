
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, userRoles, logEvent } from '@/lib/firebase';

// Types
type UserRole = 'admin' | 'teacher' | 'student';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  department?: string;
  photoURL?: string;
  createdAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
          logEvent('User authenticated', { uid: user.uid });
        } catch (error) {
          console.error('Error fetching user data:', error);
          logEvent('Error fetching user data', { error, uid: user.uid });
        }
      } else {
        setUserData(null);
        logEvent('User signed out');
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register a new user
  const register = async (email: string, password: string, role: UserRole, displayName: string) => {
    try {
      setIsLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email || email,
        displayName,
        role,
        createdAt: Date.now(),
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      setUserData(userData);
      logEvent('User registered', { uid: user.uid, role });
      
    } catch (error) {
      logEvent('Registration error', { error, email });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      logEvent('User logged in', { email });
    } catch (error) {
      logEvent('Login error', { error, email });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      logEvent('User logged out');
    } catch (error) {
      logEvent('Logout error', { error });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      logEvent('Password reset email sent', { email });
    } catch (error) {
      logEvent('Password reset error', { error, email });
      throw error;
    }
  };

  // Update user data
  const updateUserData = async (data: Partial<UserData>) => {
    if (!currentUser) throw new Error('No authenticated user');
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, data, { merge: true });
      
      // Update local user data
      setUserData(prev => prev ? { ...prev, ...data } : null);
      logEvent('User data updated', { uid: currentUser.uid });
    } catch (error) {
      logEvent('Update user data error', { error, uid: currentUser.uid });
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    isLoading,
    isAuthenticated: !!currentUser,
    login,
    register,
    logout,
    resetPassword,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
