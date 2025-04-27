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

// Your Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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

// Log events to console (would be replaced with proper logging in production)
export const logEvent = (eventName: string, details?: any) => {
  console.log(`[${new Date().toISOString()}] ${eventName}`, details || '');
};

export default { auth, db, storage, collections, userRoles, appointmentStatus, logEvent, sendPasswordReset };
