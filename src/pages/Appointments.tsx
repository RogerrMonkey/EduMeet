import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, collections, userRoles, appointmentStatus, logEvent } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import AppointmentCard, { AppointmentData } from '@/components/AppointmentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  ArrowLeftIcon,
  CalendarIcon,
  FilterIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
  ClockIcon,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Teacher interface
interface TeacherData {
  uid: string;
  displayName: string;
  email: string;
  department?: string;
  subjects?: string[];
}

// Student interface
interface StudentData {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  status?: string;
}

// Add this new interface for teacher availability
interface AvailabilitySlot {
  id: string;
  teacherId: string;
  day: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  date?: Date | { seconds: number; nanoseconds: number };
}

// Add this function to convert Firestore timestamp to Date
const getDate = (date: Date | { seconds: number; nanoseconds: number }): Date => {
  if (date instanceof Date) return date;
  return new Date((date.seconds) * 1000);
};

export default function Appointments() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();
  const { action } = useParams<{ action?: string }>();
  const location = useLocation();
  
  // Get tab from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const subTabParam = searchParams.get('subTab') || 'all';
  
  // States
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(action === 'new');
  const [activeTab, setActiveTab] = useState<string>(tabParam === 'availability' ? 'availability' : 'appointments');
  const [activeSubTab, setActiveSubTab] = useState<string>(subTabParam);
  
  // New appointment form state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [appointmentTime, setAppointmentTime] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Add these new states for teacher availability
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [newSlotDay, setNewSlotDay] = useState<string>('');
  const [newSlotDate, setNewSlotDate] = useState<Date>();
  const [newSlotStartTime, setNewSlotStartTime] = useState<string>('');
  const [newSlotEndTime, setNewSlotEndTime] = useState<string>('');
  const [isRecurringSlot, setIsRecurringSlot] = useState<boolean>(true);
  const [isAddingSlot, setIsAddingSlot] = useState<boolean>(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  // Fetch appointments and teachers
  useEffect(() => {
    if (!isLoading && userData) {
      console.log('useEffect triggered for fetch with userData:', userData.role, userData.uid);
      fetchAppointments();
      if (userData.role === 'student') {
        fetchTeachers();
      } else if (userData.role === 'teacher') {
        fetchAvailabilitySlots();
        fetchStudents();
      }
    }
  }, [userData, isLoading]);
  
  // Fetch appointments
  const fetchAppointments = async () => {
    if (!userData) return;
    
    setIsLoadingData(true);
    try {
      console.log('Fetching appointments for', userData.role, userData.uid);
      const appointmentsRef = collection(db, collections.appointments);
      let q;
      
      if (userData.role === 'student') {
        q = query(
          appointmentsRef,
          where('studentId', '==', userData.uid),
          orderBy('date', 'desc')
        );
      } else if (userData.role === 'teacher') {
        console.log('Fetching teacher appointments with teacherId:', userData.uid);
        q = query(
          appointmentsRef,
          where('teacherId', '==', userData.uid),
          orderBy('date', 'desc')
        );
      }
      
      if (q) {
        try {
        const querySnapshot = await getDocs(q);
          console.log('Query returned', querySnapshot.size, 'appointments');
        const appointmentsData: AppointmentData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as {
            title: string;
            description: string;
            date: Date | { seconds: number; nanoseconds: number };
            status: string;
            studentId: string;
            studentName: string;
            teacherId: string;
            teacherName: string;
            createdAt: Date | { seconds: number; nanoseconds: number };
          };
          
          appointmentsData.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            date: data.date,
            status: data.status,
            studentId: data.studentId,
            studentName: data.studentName,
            teacherId: data.teacherId,
            teacherName: data.teacherName,
            createdAt: data.createdAt
          });
        });
        
        setAppointments(appointmentsData);
        setIsLoadingData(false);
        logEvent('Appointments fetched', { count: appointmentsData.length });
        } catch (queryError) {
          console.error('Error executing query with orderBy:', queryError);
          
          // Try again without orderBy in case the index doesn't exist
          console.log('Trying fallback query without orderBy...');
          const fallbackQuery = userData.role === 'student'
            ? query(appointmentsRef, where('studentId', '==', userData.uid))
            : query(appointmentsRef, where('teacherId', '==', userData.uid));
            
          const fallbackSnapshot = await getDocs(fallbackQuery);
          console.log('Fallback query returned', fallbackSnapshot.size, 'appointments');
          
          const appointmentsData: AppointmentData[] = [];
          fallbackSnapshot.forEach((doc) => {
            const data = doc.data() as {
              title: string;
              description: string;
              date: Date | { seconds: number; nanoseconds: number };
              status: string;
              studentId: string;
              studentName: string;
              teacherId: string;
              teacherName: string;
              createdAt: Date | { seconds: number; nanoseconds: number };
            };
            
            appointmentsData.push({
              id: doc.id,
              title: data.title,
              description: data.description,
              date: data.date,
              status: data.status,
              studentId: data.studentId,
              studentName: data.studentName,
              teacherId: data.teacherId,
              teacherName: data.teacherName,
              createdAt: data.createdAt
            });
          });
          
          // Sort manually since orderBy didn't work
          appointmentsData.sort((a, b) => {
            const dateA = getDate(a.date).getTime();
            const dateB = getDate(b.date).getTime();
            return dateB - dateA; // descending order
          });
          
          setAppointments(appointmentsData);
          setIsLoadingData(false);
          logEvent('Appointments fetched with fallback', { count: appointmentsData.length });
        }
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments. Please try again.');
      setIsLoadingData(false);
    }
  };
  
  // Fetch teachers (for students)
  const fetchTeachers = async () => {
    try {
      const teachersRef = collection(db, collections.teachers);
      const q = query(
        teachersRef,
        where('role', '==', userRoles.TEACHER)
      );
      
      const querySnapshot = await getDocs(q);
      const teachersData: TeacherData[] = [];
      
      querySnapshot.forEach((doc) => {
        teachersData.push({
          uid: doc.id,
          ...doc.data(),
        } as TeacherData);
      });
      
      setTeachers(teachersData);
      logEvent('Teachers fetched', { count: teachersData.length });
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };
  
  // Fetch teacher's availability slots
  const fetchAvailabilitySlots = async () => {
    if (!userData || userData.role !== 'teacher') return;
    
    try {
      const slotsRef = collection(db, 'availability');
      const q = query(
        slotsRef,
        where('teacherId', '==', userData.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const slots: AvailabilitySlot[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as {
          teacherId: string;
          day: string;
          startTime: string;
          endTime: string;
          isRecurring: boolean;
          date?: { seconds: number; nanoseconds: number };
        };
        
        slots.push({
          id: doc.id,
          teacherId: data.teacherId,
          day: data.day,
          startTime: data.startTime,
          endTime: data.endTime,
          isRecurring: data.isRecurring,
          date: data.date
        });
      });
      
      setAvailabilitySlots(slots);
      logEvent('Availability slots fetched', { count: slots.length });
    } catch (error) {
      console.error('Error fetching availability slots:', error);
      toast.error('Failed to load availability slots');
    }
  };
  
  // Fetch students (for teachers creating appointments)
  const fetchStudents = async () => {
    try {
      const studentsRef = collection(db, collections.students);
      const q = query(studentsRef, where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);
      
      const studentsList: StudentData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        studentsList.push({
          uid: doc.id,
          displayName: data.displayName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          status: data.status
        });
      });
      
      setStudents(studentsList);
      logEvent('Students fetched', { count: studentsList.length });
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };
  
  // Filter appointments based on search, status, and activeSubTab
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = searchQuery === '' || 
      appointment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.teacherName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If using sub-tabs, apply that filter first
    if (activeSubTab === 'pending' && appointment.status !== appointmentStatus.PENDING) {
      return false;
    }
    
    if (activeSubTab === 'approved' && appointment.status !== appointmentStatus.APPROVED) {
      return false;
    }
    
    if (activeSubTab === 'cancelled' && appointment.status !== appointmentStatus.CANCELLED) {
      return false;
    }
    
    if (activeSubTab === 'completed' && appointment.status !== appointmentStatus.COMPLETED) {
      return false;
    }
    
    // Then apply any additional status filter from dropdown (used in "all" tab)
    const matchesStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
    
    return matchesSearch && (activeSubTab === 'all' ? matchesStatus : true);
  });
  
  // Validate new appointment form
  const validateAppointmentForm = () => {
    const errors: Record<string, string> = {};
    
    if (userData?.role === 'student') {
    if (!selectedTeacher) errors.teacher = 'Please select a teacher';
    } else if (userData?.role === 'teacher') {
      if (!selectedStudent) errors.student = 'Please select a student';
    }
    
    if (!appointmentTitle) errors.title = 'Please enter an appointment title';
    if (!appointmentDescription) errors.description = 'Please provide a description';
    if (!appointmentDate) errors.date = 'Please select a date';
    if (!appointmentTime) errors.time = 'Please select a time';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Create new appointment
  const handleCreateAppointment = async () => {
    if (!validateAppointmentForm() || !userData || !appointmentDate) return;
    
    setIsSubmitting(true);
    try {
      // Parse time
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes);
      
      let newAppointment;
      
      if (userData.role === 'student') {
      // Get teacher data
        const teacherDoc = await getDoc(doc(db, collections.teachers, selectedTeacher));
      if (!teacherDoc.exists()) {
        throw new Error('Teacher not found');
      }
      
      const teacherData = teacherDoc.data() as TeacherData;
      
      // Create appointment
        newAppointment = {
        title: appointmentTitle,
        description: appointmentDescription,
        date: Timestamp.fromDate(appointmentDateTime),
        status: appointmentStatus.PENDING,
        studentId: userData.uid,
        studentName: userData.displayName,
        teacherId: selectedTeacher,
        teacherName: teacherData.displayName,
        createdAt: Timestamp.now(),
      };
      } else if (userData.role === 'teacher') {
        // Get student data
        const studentDoc = await getDoc(doc(db, collections.students, selectedStudent));
        if (!studentDoc.exists()) {
          throw new Error('Student not found');
        }
        
        const studentData = studentDoc.data() as StudentData;
        
        // Create appointment
        newAppointment = {
          title: appointmentTitle,
          description: appointmentDescription,
          date: Timestamp.fromDate(appointmentDateTime),
          status: appointmentStatus.PENDING,
          studentId: selectedStudent,
          studentName: studentData.displayName,
          teacherId: userData.uid,
          teacherName: userData.displayName,
          createdAt: Timestamp.now(),
        };
      }
      
      if (newAppointment) {
      await addDoc(collection(db, collections.appointments), newAppointment);
      
      toast.success('Appointment created successfully');
      
      // Reset form and close dialog
      setSelectedTeacher('');
        setSelectedStudent('');
      setAppointmentTitle('');
      setAppointmentDescription('');
      setAppointmentDate(undefined);
      setAppointmentTime('');
      setShowNewAppointmentDialog(false);
      
      // Refresh appointments
      fetchAppointments();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add a new availability slot
  const addAvailabilitySlot = async () => {
    if (!userData || userData.role !== 'teacher') return;
    
    if (!newSlotStartTime || !newSlotEndTime || (isRecurringSlot && !newSlotDay) || (!isRecurringSlot && !newSlotDate)) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setIsAddingSlot(true);
      
      const newSlot: Omit<AvailabilitySlot, 'id'> = {
        teacherId: userData.uid,
        startTime: newSlotStartTime,
        endTime: newSlotEndTime,
        isRecurring: isRecurringSlot,
        day: isRecurringSlot ? newSlotDay : '',
      };
      
      if (!isRecurringSlot && newSlotDate) {
        newSlot.date = Timestamp.fromDate(newSlotDate);
      }
      
      const docRef = await addDoc(collection(db, 'availability'), newSlot);
      
      // Reset form
      setNewSlotDay('');
      setNewSlotDate(undefined);
      setNewSlotStartTime('');
      setNewSlotEndTime('');
      setIsRecurringSlot(true);
      
      // Add to local state
      setAvailabilitySlots([
        ...availabilitySlots,
        {
          id: docRef.id,
          ...newSlot
        }
      ]);
      
      toast.success('Availability slot added successfully');
      logEvent('Availability slot added', { id: docRef.id });
    } catch (error) {
      console.error('Error adding availability slot:', error);
      toast.error('Failed to add availability slot');
    } finally {
      setIsAddingSlot(false);
    }
  };
  
  // Delete an availability slot
  const deleteAvailabilitySlot = async (slotId: string) => {
    try {
      await deleteDoc(doc(db, 'availability', slotId));
      
      // Update local state
      setAvailabilitySlots(availabilitySlots.filter(slot => slot.id !== slotId));
      
      toast.success('Availability slot deleted');
      logEvent('Availability slot deleted', { id: slotId });
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      toast.error('Failed to delete availability slot');
    }
  };
  
  // Format day for display
  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  
  // Convert availability time to a more readable format
  const formatTimeRange = (start: string, end: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };
  
  // Add this function to get badge colors for tabs
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900';
      case 'pending':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200 hover:text-amber-900';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900';
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900';
      default:
        return '';
    }
  };
  
  // Add this function to get sub-tab counts
  const getStatusCounts = () => {
    const counts = {
      all: filteredAppointments.length,
      pending: appointments.filter(a => a.status === appointmentStatus.PENDING).length,
      approved: appointments.filter(a => a.status === appointmentStatus.APPROVED).length,
      cancelled: appointments.filter(a => a.status === appointmentStatus.CANCELLED).length,
      completed: appointments.filter(a => a.status === appointmentStatus.COMPLETED).length,
    };
    return counts;
  };
  
  const statusCounts = getStatusCounts();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }
  
  if (!userData) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              {userData.role === 'student' 
                ? 'Manage your appointments with teachers' 
                : 'Manage your student appointments'}
            </p>
          </div>
        </div>
        
        {/* Teacher specific view with tabs */}
        {userData?.role === 'teacher' ? (
          <Tabs 
            defaultValue={activeTab} 
            className="mt-6" 
            onValueChange={(value) => {
              setActiveTab(value);
              // Update URL without full navigation
              const newSearchParams = new URLSearchParams(location.search);
              newSearchParams.set('tab', value);
              navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
            }}
          >
            <TabsList className="mb-4 bg-background/80 backdrop-blur-sm p-1 border">
              <TabsTrigger className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary" value="appointments">Appointments</TabsTrigger>
              <TabsTrigger className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary" value="availability">My Availability</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appointments">
              {/* Sub-tabs for appointment status */}
              <Tabs 
                defaultValue={activeSubTab} 
                className="mb-6"
                onValueChange={(value) => {
                  setActiveSubTab(value);
                  // Update URL without full navigation
                  const newSearchParams = new URLSearchParams(location.search);
                  newSearchParams.set('subTab', value);
                  navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
                }}
              >
                <TabsList className="mb-6 grid grid-cols-5 w-full max-w-2xl bg-background/80 backdrop-blur-sm p-1 border">
                  <TabsTrigger 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all" 
                    value="all"
                  >
                    All
                    <span className="ml-1.5 text-xs bg-muted/80 text-muted-foreground rounded-full px-1.5 py-0.5">
                      {statusCounts.all}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending"
                    className={cn(
                      "transition-all",
                      activeSubTab === 'pending' && getStatusColor('pending')
                    )}
                  >
                    Pending
                    <span className="ml-1.5 text-xs bg-amber-200/80 text-amber-800 rounded-full px-1.5 py-0.5">
                      {statusCounts.pending}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approved"
                    className={cn(
                      "transition-all",
                      activeSubTab === 'approved' && getStatusColor('approved')
                    )}
                  >
                    Approved
                    <span className="ml-1.5 text-xs bg-green-200/80 text-green-800 rounded-full px-1.5 py-0.5">
                      {statusCounts.approved}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cancelled"
                    className={cn(
                      "transition-all",
                      activeSubTab === 'cancelled' && getStatusColor('cancelled')
                    )}
                  >
                    Cancelled
                    <span className="ml-1.5 text-xs bg-red-200/80 text-red-800 rounded-full px-1.5 py-0.5">
                      {statusCounts.cancelled}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed"
                    className={cn(
                      "transition-all",
                      activeSubTab === 'completed' && getStatusColor('completed')
                    )}
                  >
                    Completed
                    <span className="ml-1.5 text-xs bg-blue-200/80 text-blue-800 rounded-full px-1.5 py-0.5">
                      {statusCounts.completed}
                    </span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
              {/* Existing appointments search and filter UI */}
                  <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search appointments..."
                        className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
            />
          </div>
          
                    {activeSubTab === 'all' && (
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4" />
                      <span>Filter by status</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
                    )}
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchAppointments}
              disabled={isLoadingData}
            >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('Force refresh clicked with teacherId:', userData?.uid);
                        fetchAppointments();
                      }}
                      disabled={isLoadingData}
                      className="flex items-center gap-2"
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                      Force Refresh
              </Button>
        </div>
        
        {isLoadingData ? (
                    <div className="flex justify-center py-12 animate-pulse">
                      <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                </div>
                  ) : filteredAppointments.length === 0 ? (
                    <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                        <CardDescription className="mb-4">
                          {activeSubTab === 'all' 
                            ? "You don't have any appointments yet." 
                            : `You don't have any ${activeSubTab} appointments.`}
                        </CardDescription>
                        <Button
                          onClick={() => setShowNewAppointmentDialog(true)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Schedule an Appointment
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                      {filteredAppointments.map((appointment, index) => (
                        <div key={appointment.id} className={cn(
                          "transition-all",
                          "animate-in fade-in slide-in-from-bottom-4",
                          { "delay-100": index % 3 === 0 },
                          { "delay-150": index % 3 === 1 },
                          { "delay-200": index % 3 === 2 }
                        )}>
                    <AppointmentCard 
                      appointment={appointment}
                            onStatusChange={fetchAppointments}
                    />
                        </div>
                  ))}
                </div>
                  )}
                </TabsContent>

                <TabsContent value="pending">
                  <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                    <div className="relative flex-1 min-w-[200px]">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search appointments..."
                        className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={fetchAppointments}
                      disabled={isLoadingData}
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('Force refresh clicked with teacherId:', userData?.uid);
                        fetchAppointments();
                      }}
                      disabled={isLoadingData}
                      className="flex items-center gap-2"
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                      Force Refresh
                    </Button>
                    
                    <Button
                      onClick={() => setShowNewAppointmentDialog(true)}
                    >
                      New Appointment
                    </Button>
                  </div>
                  
                  {isLoadingData ? (
                    <div className="flex justify-center py-12 animate-pulse">
                      <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                        <CardDescription className="mb-4">
                          You don't have any pending appointments.
                        </CardDescription>
                        <Button
                          onClick={() => setShowNewAppointmentDialog(true)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Schedule an Appointment
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                      {filteredAppointments.map((appointment, index) => (
                        <div key={appointment.id} className={cn(
                          "transition-all",
                          "animate-in fade-in slide-in-from-bottom-4",
                          { "delay-100": index % 3 === 0 },
                          { "delay-150": index % 3 === 1 },
                          { "delay-200": index % 3 === 2 }
                        )}>
                          <AppointmentCard
                            appointment={appointment}
                            onStatusChange={fetchAppointments}
                          />
                        </div>
                      ))}
                </div>
              )}
                </TabsContent>

                <TabsContent value="approved">
                  <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                    <div className="relative flex-1 min-w-[200px]">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search appointments..."
                        className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={fetchAppointments}
                      disabled={isLoadingData}
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('Force refresh clicked with teacherId:', userData?.uid);
                        fetchAppointments();
                      }}
                      disabled={isLoadingData}
                      className="flex items-center gap-2"
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                      Force Refresh
                    </Button>
                    
                    <Button
                      onClick={() => setShowNewAppointmentDialog(true)}
                    >
                      New Appointment
                    </Button>
                  </div>
                  
                  {isLoadingData ? (
                    <div className="flex justify-center py-12 animate-pulse">
                      <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                        <CardDescription className="mb-4">
                          You don't have any approved appointments.
                        </CardDescription>
                        <Button
                          onClick={() => setShowNewAppointmentDialog(true)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Schedule an Appointment
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                      {filteredAppointments.map((appointment, index) => (
                        <div key={appointment.id} className={cn(
                          "transition-all",
                          "animate-in fade-in slide-in-from-bottom-4",
                          { "delay-100": index % 3 === 0 },
                          { "delay-150": index % 3 === 1 },
                          { "delay-200": index % 3 === 2 }
                        )}>
                          <AppointmentCard
                            appointment={appointment}
                            onStatusChange={fetchAppointments}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cancelled">
                  <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                    <div className="relative flex-1 min-w-[200px]">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search appointments..."
                        className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={fetchAppointments}
                      disabled={isLoadingData}
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('Force refresh clicked with teacherId:', userData?.uid);
                        fetchAppointments();
                      }}
                      disabled={isLoadingData}
                      className="flex items-center gap-2"
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                      Force Refresh
                    </Button>
                    
                    <Button
                      onClick={() => setShowNewAppointmentDialog(true)}
                    >
                      New Appointment
                    </Button>
                  </div>
                  
                  {isLoadingData ? (
                    <div className="flex justify-center py-12 animate-pulse">
                      <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                        <CardDescription className="mb-4">
                          You don't have any cancelled appointments.
                        </CardDescription>
                        <Button
                          onClick={() => setShowNewAppointmentDialog(true)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Schedule an Appointment
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                      {filteredAppointments.map((appointment, index) => (
                        <div key={appointment.id} className={cn(
                          "transition-all",
                          "animate-in fade-in slide-in-from-bottom-4",
                          { "delay-100": index % 3 === 0 },
                          { "delay-150": index % 3 === 1 },
                          { "delay-200": index % 3 === 2 }
                        )}>
                          <AppointmentCard
                            appointment={appointment}
                            onStatusChange={fetchAppointments}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed">
                  <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                    <div className="relative flex-1 min-w-[200px]">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search appointments..."
                        className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={fetchAppointments}
                      disabled={isLoadingData}
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('Force refresh clicked with teacherId:', userData?.uid);
                        fetchAppointments();
                      }}
                      disabled={isLoadingData}
                      className="flex items-center gap-2"
                    >
                      {isLoadingData ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-4 w-4" />
                      )}
                      Force Refresh
                    </Button>
                    
                    <Button
                      onClick={() => setShowNewAppointmentDialog(true)}
                    >
                      New Appointment
                    </Button>
                  </div>
                  
                  {isLoadingData ? (
                    <div className="flex justify-center py-12 animate-pulse">
                      <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-3 mb-3">
                          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                        <CardDescription className="mb-4">
                          You don't have any completed appointments.
                        </CardDescription>
                        <Button
                          onClick={() => setShowNewAppointmentDialog(true)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Schedule an Appointment
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                      {filteredAppointments.map((appointment, index) => (
                        <div key={appointment.id} className={cn(
                          "transition-all",
                          "animate-in fade-in slide-in-from-bottom-4",
                          { "delay-100": index % 3 === 0 },
                          { "delay-150": index % 3 === 1 },
                          { "delay-200": index % 3 === 2 }
                        )}>
                          <AppointmentCard
                            appointment={appointment}
                            onStatusChange={fetchAppointments}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="availability">
              <div className="mb-6">
                <Card className="mb-6 border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle className="text-xl">Add New Availability</CardTitle>
                    <CardDescription>
                      Set up when you're available to meet with students
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="recurring" 
                            checked={isRecurringSlot}
                            onCheckedChange={(checked) => setIsRecurringSlot(checked === true)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label htmlFor="recurring">Weekly recurring slot</Label>
                        </div>
                        
                        {isRecurringSlot ? (
                          <div className="space-y-2">
                            <Label>Day of week</Label>
                            <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                              <SelectTrigger className="border-muted bg-background/80 focus-visible:ring-primary">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monday">Monday</SelectItem>
                                <SelectItem value="tuesday">Tuesday</SelectItem>
                                <SelectItem value="wednesday">Wednesday</SelectItem>
                                <SelectItem value="thursday">Thursday</SelectItem>
                                <SelectItem value="friday">Friday</SelectItem>
                                <SelectItem value="saturday">Saturday</SelectItem>
                                <SelectItem value="sunday">Sunday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Specific date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal border-muted bg-background/80",
                                    !newSlotDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {newSlotDate ? format(newSlotDate, "PPP") : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={newSlotDate}
                                  onSelect={setNewSlotDate}
                                  initialFocus
                                  disabled={(date) => date < new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Start time</Label>
                          <Input
                            type="time"
                            value={newSlotStartTime}
                            onChange={(e) => setNewSlotStartTime(e.target.value)}
                            className="border-muted bg-background/80 focus-visible:ring-primary"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>End time</Label>
                          <Input
                            type="time"
                            value={newSlotEndTime}
                            onChange={(e) => setNewSlotEndTime(e.target.value)}
                            className="border-muted bg-background/80 focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                  </div>
                </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      onClick={addAvailabilitySlot}
                      disabled={isAddingSlot}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isAddingSlot ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Add Availability
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
                
                <h3 className="text-lg font-medium mb-4 text-foreground/90">Your Availability</h3>
                
                {availabilitySlots.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                    {availabilitySlots.map((slot, index) => (
                      <Card 
                        key={slot.id} 
                        className={cn(
                          "relative transition-all border-l-4 border-l-primary/70 bg-background/80 hover:shadow-md animate-in fade-in slide-in-from-bottom-4",
                          { "delay-100": index % 3 === 0 },
                          { "delay-150": index % 3 === 1 },
                          { "delay-200": index % 3 === 2 }
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => deleteAvailabilitySlot(slot.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                        
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {slot.isRecurring 
                              ? `Every ${formatDay(slot.day)}` 
                              : format(getDate(slot.date!), 'MMMM d, yyyy')}
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-primary/70" />
                            <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
                          </div>
                </CardContent>
              </Card>
            ))}
                  </div>
                ) : (
                  <Card className="bg-muted/20 border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground mb-2">No availability slots added yet</p>
                      <p className="text-sm text-muted-foreground">
                        Add when you're available to meet with students
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Student view (keep existing code)
          <>
            {/* Existing search and filter UI for students */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search appointments..."
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4" />
                    <span>Filter by status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={fetchAppointments}
                disabled={isLoadingData}
              >
                {isLoadingData ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  console.log('Force refresh clicked with studentId:', userData?.uid);
                  fetchAppointments();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2"
              >
                {isLoadingData ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4" />
                )}
                Force Refresh
              </Button>
            </div>
            
            {/* Student specific view with subtabs */}
            {userData?.role === 'student' && (
              <>
                <Tabs 
                  defaultValue={activeSubTab} 
                  className="mt-6"
                  onValueChange={(value) => {
                    setActiveSubTab(value);
                    // Update URL without full navigation
                    const newSearchParams = new URLSearchParams(location.search);
                    newSearchParams.set('subTab', value);
                    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
                  }}
                >
                  <TabsList className="mb-4 grid grid-cols-5 w-full max-w-2xl bg-background/80 backdrop-blur-sm p-1 border">
                    <TabsTrigger 
                      className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all" 
                      value="all"
                    >
                      All
                      <span className="ml-1.5 text-xs bg-muted/80 text-muted-foreground rounded-full px-1.5 py-0.5">
                        {statusCounts.all}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="pending"
                      className={cn(
                        "transition-all",
                        activeSubTab === 'pending' && getStatusColor('pending')
                      )}
                    >
                      Pending
                      <span className="ml-1.5 text-xs bg-amber-200/80 text-amber-800 rounded-full px-1.5 py-0.5">
                        {statusCounts.pending}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="approved"
                      className={cn(
                        "transition-all",
                        activeSubTab === 'approved' && getStatusColor('approved')
                      )}
                    >
                      Approved
                      <span className="ml-1.5 text-xs bg-green-200/80 text-green-800 rounded-full px-1.5 py-0.5">
                        {statusCounts.approved}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="cancelled"
                      className={cn(
                        "transition-all",
                        activeSubTab === 'cancelled' && getStatusColor('cancelled')
                      )}
                    >
                      Cancelled
                      <span className="ml-1.5 text-xs bg-red-200/80 text-red-800 rounded-full px-1.5 py-0.5">
                        {statusCounts.cancelled}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="completed"
                      className={cn(
                        "transition-all",
                        activeSubTab === 'completed' && getStatusColor('completed')
                      )}
                    >
                      Completed
                      <span className="ml-1.5 text-xs bg-blue-200/80 text-blue-800 rounded-full px-1.5 py-0.5">
                        {statusCounts.completed}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                      <div className="relative flex-1 min-w-[200px]">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search appointments..."
                          className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
                        />
                      </div>
                      
                      {activeSubTab === 'all' && (
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <div className="flex items-center gap-2">
                              <FilterIcon className="h-4 w-4" />
                              <span>Filter by status</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={fetchAppointments}
                        disabled={isLoadingData}
                      >
            {isLoadingData ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCwIcon className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          console.log('Force refresh clicked with studentId:', userData?.uid);
                          fetchAppointments();
                        }}
                        disabled={isLoadingData}
                        className="flex items-center gap-2"
                      >
                        {isLoadingData ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCwIcon className="h-4 w-4" />
                        )}
                        Force Refresh
                      </Button>
                      
                      <Button
                        onClick={() => setShowNewAppointmentDialog(true)}
                      >
                        New Appointment
                      </Button>
          </div>
                    
                    {isLoadingData ? (
                      <div className="flex justify-center py-12 animate-pulse">
                        <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                      </div>
                    ) : filteredAppointments.length === 0 ? (
                      <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                        <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                          <div className="rounded-full bg-muted p-3 mb-3">
                            <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                          <CardDescription className="mb-4">
                            You don't have any appointments yet.
                          </CardDescription>
                          <Button
                            onClick={() => setShowNewAppointmentDialog(true)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            Schedule an Appointment
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                        {filteredAppointments.map((appointment, index) => (
                          <div key={appointment.id} className={cn(
                            "transition-all",
                            "animate-in fade-in slide-in-from-bottom-4",
                            { "delay-100": index % 3 === 0 },
                            { "delay-150": index % 3 === 1 },
                            { "delay-200": index % 3 === 2 }
                          )}>
              <AppointmentCard 
                appointment={appointment}
                              onStatusChange={fetchAppointments}
              />
                          </div>
            ))}
          </div>
                    )}
                  </TabsContent>
                  
                  {/* Individual status tabs */}
                  {['pending', 'approved', 'cancelled', 'completed'].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue}>
                      <div className="flex flex-wrap gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
                        <div className="relative flex-1 min-w-[200px]">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search appointments..."
                            className="pl-9 border-muted bg-background/80 backdrop-blur-sm focus-visible:ring-primary"
                          />
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={fetchAppointments}
                          disabled={isLoadingData}
                        >
                          {isLoadingData ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCwIcon className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            console.log('Force refresh clicked with studentId:', userData?.uid);
                            fetchAppointments();
                          }}
                          disabled={isLoadingData}
                          className="flex items-center gap-2"
                        >
                          {isLoadingData ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCwIcon className="h-4 w-4" />
                          )}
                          Force Refresh
                        </Button>
                        
                        <Button
                          onClick={() => setShowNewAppointmentDialog(true)}
                        >
                          New Appointment
                        </Button>
              </div>
                      
                      {isLoadingData ? (
                        <div className="flex justify-center py-12 animate-pulse">
                          <Loader2Icon className="h-8 w-8 animate-spin text-primary/60" />
                        </div>
                      ) : filteredAppointments.length === 0 ? (
                        <Card className="bg-muted/20 border-dashed animate-in fade-in duration-500 ease-out">
                          <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                            <div className="rounded-full bg-muted p-3 mb-3">
                              <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-xl mb-1">No appointments found</CardTitle>
                            <CardDescription className="mb-4">
                              You don't have any {tabValue} appointments.
                            </CardDescription>
                <Button 
                  onClick={() => setShowNewAppointmentDialog(true)}
                              className="bg-primary hover:bg-primary/90"
                >
                              Schedule an Appointment
                </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 ease-out">
                          {filteredAppointments.map((appointment, index) => (
                            <div key={appointment.id} className={cn(
                              "transition-all",
                              "animate-in fade-in slide-in-from-bottom-4",
                              { "delay-100": index % 3 === 0 },
                              { "delay-150": index % 3 === 1 },
                              { "delay-200": index % 3 === 2 }
                            )}>
                              <AppointmentCard
                                appointment={appointment}
                                onStatusChange={fetchAppointments}
                              />
                            </div>
                          ))}
              </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </>
              )}
          </>
        )}
      </main>
      
      {/* New Appointment Dialog */}
      <Dialog 
        open={showNewAppointmentDialog} 
        onOpenChange={setShowNewAppointmentDialog}
      >
        <DialogContent className="sm:max-w-[500px] border-t-4 border-t-primary">
          <DialogHeader>
            <DialogTitle className="text-xl">Book a New Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details to schedule an appointment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {userData?.role === 'student' ? (
            <div className="space-y-2">
              <Label htmlFor="teacher">Select Teacher</Label>
              <Select
                value={selectedTeacher}
                onValueChange={setSelectedTeacher}
              >
                  <SelectTrigger id="teacher" className="border-muted bg-background/80 focus:ring-primary">
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.uid} value={teacher.uid}>
                      {teacher.displayName}
                      {teacher.department && ` (${teacher.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.teacher && (
                <p className="text-sm text-destructive">{formErrors.teacher}</p>
              )}
            </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="student">Select Student</Label>
                <Select
                  value={selectedStudent}
                  onValueChange={setSelectedStudent}
                >
                  <SelectTrigger id="student" className="border-muted bg-background/80 focus:ring-primary">
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.uid} value={student.uid}>
                        {student.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.student && (
                  <p className="text-sm text-destructive">{formErrors.student}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="title">Appointment Title</Label>
              <Input
                id="title"
                placeholder="e.g., Math Homework Help"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                className="border-muted bg-background/80 focus-visible:ring-primary"
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe why you're scheduling this appointment..."
                value={appointmentDescription}
                onChange={(e) => setAppointmentDescription(e.target.value)}
                rows={3}
                className="border-muted bg-background/80 focus-visible:ring-primary resize-none"
              />
              {formErrors.description && (
                <p className="text-sm text-destructive">{formErrors.description}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-muted bg-background/80",
                        !appointmentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={setAppointmentDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {formErrors.date && (
                  <p className="text-sm text-destructive">{formErrors.date}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="border-muted bg-background/80 focus-visible:ring-primary"
                />
                {formErrors.time && (
                  <p className="text-sm text-destructive">{formErrors.time}</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewAppointmentDialog(false)}
              className="border-muted"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAppointment}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : 'Book Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
