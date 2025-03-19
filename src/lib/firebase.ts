
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey-ThisIsAPlaceholderKey",
  authDomain: "student-teacher-booking.firebaseapp.com",
  projectId: "student-teacher-booking",
  storageBucket: "student-teacher-booking.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to Firebase emulators in development mode
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.error('Failed to connect to Firebase emulators:', error);
  }
}

// Collection references for easier access
export const collections = {
  users: 'users',
  appointments: 'appointments',
  messages: 'messages',
  departments: 'departments',
  subjects: 'subjects',
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

// Log events to console (would be replaced with proper logging in production)
export const logEvent = (eventName: string, details?: any) => {
  console.log(`[${new Date().toISOString()}] ${eventName}`, details || '');
};

export default { auth, db, storage, collections, userRoles, appointmentStatus, logEvent };
