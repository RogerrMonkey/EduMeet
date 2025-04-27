import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  inMemoryPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


// Default admin credentials
export const defaultAdminCredentials = {
  email: 'admin@admin.com',
  password: 'admin123',
  displayName: 'System Admin',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase auth with persistence
export const auth = getAuth(app);

// Force persist sessions even when browser is closed
// This must be called before any other auth operations
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    logEvent('Auth persistence set to browserLocalPersistence');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
    // Fall back to in-memory persistence if local persistence fails
    setPersistence(auth, inMemoryPersistence).catch(console.error);
  });

export const db = getFirestore(app);
export const storage = getStorage(app);

// Collection references for easier access - new structure
export const collections = {
  admin: 'admin',
  teachers: 'teachers',
  students: 'students',
  appointments: 'appointments',
  messages: 'messages',
  departments: 'departments',
  subjects: 'subjects',
  availability: 'availability'
};

// User roles for authorization
export const userRoles = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

// Appointment status values
export const appointmentStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

// Create default admin account if it doesn't exist
export const ensureDefaultAdminExists = async () => {
  try {
    // Use getDoc to check if admin exists in Firestore without affecting auth state
    const adminQuery = await getDoc(doc(db, collections.admin, 'default-admin'));
    
    if (adminQuery.exists()) {
      logEvent('Default admin exists');
      return; // Admin already exists, don't attempt sign in/out
    }
    
    try {
      // Create auth account using email/password but don't sign in the current user
      await createUserWithEmailAndPassword(
        auth,
        defaultAdminCredentials.email,
        defaultAdminCredentials.password
      ).then(async ({ user }) => {
        // Create admin document in the admin collection
        await setDoc(doc(db, collections.admin, user.uid), {
          uid: user.uid,
          email: defaultAdminCredentials.email,
          displayName: defaultAdminCredentials.displayName,
          role: userRoles.ADMIN,
          status: 'approved',
          createdAt: Date.now(),
        });
        
        // Create a marker document to avoid recreating admin
        await setDoc(doc(db, 'admin-accounts', 'default-admin'), {
          exists: true,
          createdAt: Date.now(),
        });

        logEvent('Default admin account created');
        
        // Sign out only this operation (not the current user)
        await signOut(auth);
      });
    } catch (error: any) {
      // Admin likely already exists, just mark it
      if (error.code === 'auth/email-already-in-use') {
        await setDoc(doc(db, 'admin-accounts', 'default-admin'), {
          exists: true,
          createdAt: Date.now(),
        });
        logEvent('Default admin exists (marked in database)');
      } else {
        console.error('Error checking/creating default admin:', error);
      }
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
};

// Password reset functionality
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
    logEvent('Password reset email sent', { email });
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Call this function when the app initializes
ensureDefaultAdminExists().catch(console.error);

// Log events to console (would be replaced with proper logging in production)
export const logEvent = (eventName: string, details?: any) => {
  console.log(`[${new Date().toISOString()}] ${eventName}`, details || '');
};

export default { auth, db, storage, collections, userRoles, appointmentStatus, logEvent, sendPasswordReset };
