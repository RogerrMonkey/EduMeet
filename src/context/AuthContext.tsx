import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, logEvent, collections, userRoles, sendPasswordReset } from '@/lib/firebase';

// User role type
type UserRole = 'admin' | 'teacher' | 'student';

// User data type
interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  department?: string;
  photoURL?: string;
  phoneNumber?: string;
  status?: 'pending' | 'approved' | 'rejected';
  subjects?: string[];
  createdAt: number;
  pendingAuth?: boolean;
}

// Auth context type
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<UserData>;
  register: (email: string, password: string, role: UserRole, displayName: string, phoneNumber: string) => Promise<UserData>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
}

// Helper function to get collection name based on role
const getCollectionByRole = (role: UserRole): string => {
  switch (role) {
    case userRoles.ADMIN:
      return collections.admin;
    case userRoles.TEACHER:
      return collections.teachers;
    case userRoles.STUDENT:
      return collections.students;
    default:
      return collections.students;
  }
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Fetch user data from Firestore - checks all collections
  const fetchUserData = async (uid: string): Promise<UserData | null> => {
    try {
      // Try admin collection first
      let userDoc = await getDoc(doc(db, collections.admin, uid));
      if (userDoc.exists()) {
        return { ...userDoc.data(), role: userRoles.ADMIN } as UserData;
      }
      
      // Try teachers collection
      userDoc = await getDoc(doc(db, collections.teachers, uid));
      if (userDoc.exists()) {
        return { ...userDoc.data(), role: userRoles.TEACHER } as UserData;
      }
      
      // Try students collection
      userDoc = await getDoc(doc(db, collections.students, uid));
      if (userDoc.exists()) {
        return { ...userDoc.data(), role: userRoles.STUDENT } as UserData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          
          if (user) {
            try {
              // User is signed in
              const userData = await fetchUserData(user.uid);
              
              if (userData) {
                setIsAuthenticated(true);
                setUserData({
                  ...userData,
              pendingAuth: userData.role === userRoles.STUDENT && userData.status === 'pending'
                });
              } else {
            // If we have auth but no user data, handle as minimal auth
            setIsAuthenticated(false);
            setUserData(null);
            logEvent('User authenticated but no data found in any collection', { uid: user.uid });
              }
            } catch (error) {
          console.error('Error processing authentication:', error);
          setIsAuthenticated(false);
          setUserData(null);
            } finally {
                setIsLoading(false);
            }
          } else {
            // User is signed out
              setIsAuthenticated(false);
              setUserData(null);
              setIsLoading(false);
          }
        });
        
        // Set a timeout to force isLoading to false if Firebase auth is taking too long
        const loadingTimeoutId = setTimeout(() => {
      if (isLoading) {
            console.log('Auth initialization timeout reached, forcing loading state to false');
            setIsLoading(false);
          }
        }, 2000);
        
        return () => {
          unsubscribe();
          clearTimeout(loadingTimeoutId);
        };
  }, []);

  // Register a new user
  const register = async (email: string, password: string, role: UserRole, displayName: string, phoneNumber: string) => {
    try {
      setIsLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Get the appropriate collection based on role
      const collectionName = getCollectionByRole(role);
      
      // Create user document in the appropriate collection
      const userData: UserData = {
        uid: user.uid,
        email: user.email || email,
        displayName,
        phoneNumber,
        role,
        status: role === userRoles.STUDENT ? 'pending' : 'approved', // Students start with pending, others approved
        createdAt: Date.now(),
      };
      
      await setDoc(doc(db, collectionName, user.uid), userData);
      
      setIsAuthenticated(true);
      setUserData({
        ...userData,
        pendingAuth: role === userRoles.STUDENT
      });
      
      logEvent('User registered', { uid: user.uid, role, collection: collectionName });
      return userData;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login a user
  const login = async (email: string, password: string): Promise<UserData> => {
    try {
      setIsLoading(true);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user data from Firestore collections
      const userData = await fetchUserData(user.uid);
      
      if (!userData) {
        throw new Error('User data not found. Please contact support.');
      }
      
      // Check if student is pending approval
      if (userData.role === userRoles.STUDENT && userData.status === 'pending') {
        // Sign out if student is pending approval
          await signOut(auth);
        throw new Error('Your account is pending approval from an administrator.');
        }

      setIsAuthenticated(true);
        setUserData(userData);
        
      logEvent('User logged in', { uid: user.uid, role: userData.role });
        return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout a user
  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setUserData(null);
      logEvent('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordReset(email);
      // Note: We're using the imported sendPasswordReset function from firebase.ts
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Update user data
  const updateUserData = async (data: Partial<UserData>) => {
    if (!currentUser || !userData) {
      throw new Error('No authenticated user');
    }
    
    try {
      const collectionName = getCollectionByRole(userData.role);
      const userRef = doc(db, collectionName, currentUser.uid);
      
      await updateDoc(userRef, {
        ...data,
        updatedAt: Date.now()
      });
      
      setUserData({
        ...userData,
        ...data
      });
      
      logEvent('User data updated', { uid: currentUser.uid, collection: collectionName });
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userData,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    resetPassword,
    sendPasswordReset: resetPassword,
    updateUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
