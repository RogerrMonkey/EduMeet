import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc, limit, Timestamp, addDoc } from 'firebase/firestore';
import { db, collections, userRoles, appointmentStatus, logEvent } from './firebase';
import { User } from 'firebase/auth';

// Teacher interface
export interface TeacherData {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  subjects?: string[];
  role: 'teacher';
  status?: 'approved' | 'pending' | 'rejected';
}

// Student interface
export interface StudentData {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  status?: 'pending' | 'approved' | 'rejected';
  role: 'student';
}

// Appointment interface
export interface AppointmentData {
  id: string;
  title: string;
  description: string;
  date: Date | { seconds: number; nanoseconds: number };
  status: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  createdAt: Date | { seconds: number; nanoseconds: number };
}

// Availability slot interface
export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  day: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  date?: Date | { seconds: number; nanoseconds: number };
}

// Helper function to convert Firestore timestamp to Date
export const getDate = (date: Date | { seconds: number; nanoseconds: number }): Date => {
  if (date instanceof Date) return date;
  return new Date((date.seconds) * 1000);
};

/**
 * Fetch teachers from Firestore
 */
export const fetchTeachers = async (): Promise<TeacherData[]> => {
  try {
    const teachersRef = collection(db, collections.teachers);
    const querySnapshot = await getDocs(teachersRef);
    
    const teachersData: TeacherData[] = [];
    querySnapshot.forEach((doc) => {
      teachersData.push({ uid: doc.id, ...doc.data(), role: userRoles.TEACHER } as TeacherData);
    });
    
    logEvent('Teachers fetched', { count: teachersData.length });
    return teachersData;
  } catch (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }
};

/**
 * Fetch pending students awaiting approval
 */
export const fetchPendingStudents = async (): Promise<StudentData[]> => {
  try {
    const studentsRef = collection(db, collections.students);
    const q = query(
      studentsRef,
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    
    const studentsData: StudentData[] = [];
    querySnapshot.forEach((doc) => {
      studentsData.push({ uid: doc.id, ...doc.data(), role: userRoles.STUDENT } as StudentData);
    });
    
    logEvent('Pending students fetched', { count: studentsData.length });
    return studentsData;
  } catch (error) {
    console.error('Error fetching pending students:', error);
    throw error;
  }
};

/**
 * Fetch appointments for a user (student or teacher)
 */
export const fetchAppointments = async (
  userData: { uid: string; role: string },
  statusFilter?: string,
  maxResults: number = 0
): Promise<AppointmentData[]> => {
  if (!userData) return [];
  
  try {
    const appointmentsRef = collection(db, collections.appointments);
    let q;
    
    // Create the appropriate query based on user role
    if (userData.role === userRoles.STUDENT) {
      q = query(
        appointmentsRef,
        where('studentId', '==', userData.uid),
        orderBy('date', 'desc')
      );
    } else if (userData.role === userRoles.TEACHER) {
      q = query(
        appointmentsRef,
        where('teacherId', '==', userData.uid),
        orderBy('date', 'desc')
      );
    } else if (userData.role === userRoles.ADMIN) {
      q = query(
        appointmentsRef,
        orderBy('date', 'desc')
      );
    }
    
    // Apply limit if specified
    if (maxResults > 0 && q) {
      q = query(q, limit(maxResults));
    }
    
    if (q) {
      const querySnapshot = await getDocs(q);
      const appointmentsData: AppointmentData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<AppointmentData, 'id'>;
        
        // Filter by status if specified
        if (statusFilter && statusFilter !== 'all' && data.status !== statusFilter) {
          return;
        }
        
        appointmentsData.push({
          id: doc.id,
          ...data
        });
      });
      
      logEvent('Appointments fetched', { count: appointmentsData.length });
      return appointmentsData;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    
    // Try a simpler query if the index might be missing
    try {
      const appointmentsRef = collection(db, collections.appointments);
      let q;
      
      if (userData.role === userRoles.STUDENT) {
        q = query(appointmentsRef, where('studentId', '==', userData.uid));
      } else if (userData.role === userRoles.TEACHER) {
        q = query(appointmentsRef, where('teacherId', '==', userData.uid));
      } else if (userData.role === userRoles.ADMIN) {
        q = query(appointmentsRef);
      }
      
      if (maxResults > 0 && q) {
        q = query(q, limit(maxResults));
      }
      
      if (q) {
        const querySnapshot = await getDocs(q);
        const appointmentsData: AppointmentData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<AppointmentData, 'id'>;
          
          if (statusFilter && statusFilter !== 'all' && data.status !== statusFilter) {
            return;
          }
          
          appointmentsData.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort manually since we don't have an index
        appointmentsData.sort((a, b) => {
          const dateA = getDate(a.date).getTime();
          const dateB = getDate(b.date).getTime();
          return dateB - dateA; // Descending order
        });
        
        logEvent('Appointments fetched with fallback query', { count: appointmentsData.length });
        return appointmentsData;
      }
    } catch (secondError) {
      console.error('Error in fallback query:', secondError);
    }
    
    throw error;
  }
};

/**
 * Fetch availability slots for a teacher
 */
export const fetchAvailabilitySlots = async (teacherId: string): Promise<AvailabilitySlot[]> => {
  try {
    const slotsRef = collection(db, collections.availability);
    const q = query(slotsRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    
    const slots: AvailabilitySlot[] = [];
    querySnapshot.forEach((doc) => {
      slots.push({ 
        id: doc.id, 
        ...doc.data() as Omit<AvailabilitySlot, 'id'> 
      });
    });
    
    logEvent('Availability slots fetched', { count: slots.length });
    return slots;
  } catch (error) {
    console.error('Error fetching availability slots:', error);
    throw error;
  }
};

/**
 * Update student status (approve/reject)
 */
export const updateStudentStatus = async (
  studentId: string, 
  status: 'approved' | 'rejected',
  adminId: string
): Promise<void> => {
  try {
    const studentRef = doc(db, collections.students, studentId);
    
    await updateDoc(studentRef, { 
      status,
      updatedAt: Date.now(),
      updatedBy: adminId
    });
    
    logEvent(`Student ${status}`, { studentId });
  } catch (error) {
    console.error(`Error ${status === 'approved' ? 'approving' : 'rejecting'} student:`, error);
    throw error;
  }
};

/**
 * Delete a teacher
 */
export const deleteTeacher = async (teacherId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, collections.teachers, teacherId));
    logEvent('Teacher deleted', { teacherId });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    throw error;
  }
};

/**
 * Create a new appointment
 */
export const createAppointment = async (
  teacherId: string,
  teacherName: string,
  studentId: string,
  studentName: string,
  title: string,
  description: string,
  date: Date
): Promise<string> => {
  try {
    const appointmentData = {
      title,
      description,
      date,
      status: appointmentStatus.PENDING,
      teacherId,
      teacherName,
      studentId,
      studentName,
      createdAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, collections.appointments), appointmentData);
    logEvent('Appointment created', { appointmentId: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

/**
 * Update appointment status
 */
export const updateAppointmentStatus = async (
  appointmentId: string,
  status: string,
  userId: string
): Promise<void> => {
  try {
    const appointmentRef = doc(db, collections.appointments, appointmentId);
    
    await updateDoc(appointmentRef, {
      status,
      updatedAt: new Date(),
      updatedBy: userId
    });
    
    logEvent('Appointment status updated', { appointmentId, status });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
}; 