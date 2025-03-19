
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp, getDoc, doc } from 'firebase/firestore';
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
} from 'lucide-react';

// Teacher interface
interface TeacherData {
  uid: string;
  displayName: string;
  email: string;
  department?: string;
  subjects?: string[];
}

export default function Appointments() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();
  const { action } = useParams<{ action?: string }>();
  
  // States
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(action === 'new');
  
  // New appointment form state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [appointmentTime, setAppointmentTime] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  // Fetch appointments and teachers
  useEffect(() => {
    if (userData) {
      fetchAppointments();
      if (userData.role === 'student') {
        fetchTeachers();
      }
    }
  }, [userData]);
  
  // Fetch appointments
  const fetchAppointments = async () => {
    if (!userData) return;
    
    setIsLoadingData(true);
    try {
      const appointmentsRef = collection(db, collections.appointments);
      let q;
      
      if (userData.role === 'student') {
        q = query(
          appointmentsRef,
          where('studentId', '==', userData.uid),
          orderBy('date', 'desc')
        );
      } else if (userData.role === 'teacher') {
        q = query(
          appointmentsRef,
          where('teacherId', '==', userData.uid),
          orderBy('date', 'desc')
        );
      } else if (userData.role === 'admin') {
        q = query(
          appointmentsRef,
          orderBy('date', 'desc')
        );
      }
      
      if (q) {
        const querySnapshot = await getDocs(q);
        const appointmentsData: AppointmentData[] = [];
        
        querySnapshot.forEach((doc) => {
          appointmentsData.push({
            id: doc.id,
            ...doc.data(),
          } as AppointmentData);
        });
        
        setAppointments(appointmentsData);
        logEvent('Appointments fetched', { count: appointmentsData.length });
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoadingData(false);
    }
  };
  
  // Fetch teachers (for students)
  const fetchTeachers = async () => {
    try {
      const teachersRef = collection(db, collections.users);
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
  
  // Filter appointments based on search and status
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = searchQuery === '' || 
      appointment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.teacherName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || appointment.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });
  
  // Validate new appointment form
  const validateAppointmentForm = () => {
    const errors: Record<string, string> = {};
    
    if (!selectedTeacher) errors.teacher = 'Please select a teacher';
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
      
      // Get teacher data
      const teacherDoc = await getDoc(doc(db, collections.users, selectedTeacher));
      if (!teacherDoc.exists()) {
        throw new Error('Teacher not found');
      }
      
      const teacherData = teacherDoc.data() as TeacherData;
      
      // Create appointment
      const newAppointment = {
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
      
      await addDoc(collection(db, collections.appointments), newAppointment);
      
      toast.success('Appointment created successfully');
      logEvent('Appointment created', { studentId: userData.uid, teacherId: selectedTeacher });
      
      // Reset form and close dialog
      setSelectedTeacher('');
      setAppointmentTitle('');
      setAppointmentDescription('');
      setAppointmentDate(undefined);
      setAppointmentTime('');
      setShowNewAppointmentDialog(false);
      
      // Refresh appointments
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
    <div className="min-h-screen pb-10">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 rounded-full"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              {userData.role === 'student' 
                ? 'Manage your appointments with teachers' 
                : 'Manage your student appointments'}
            </p>
          </div>
        </div>
        
        {/* Control panel */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3">
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
            >
              <SelectTrigger className="w-40">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value={appointmentStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={appointmentStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={appointmentStatus.CANCELLED}>Cancelled</SelectItem>
                <SelectItem value={appointmentStatus.COMPLETED}>Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchAppointments}
              disabled={isLoadingData}
            >
              <RefreshCwIcon className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </Button>
            
            {userData.role === 'student' && (
              <Button onClick={() => setShowNewAppointmentDialog(true)}>
                Book Appointment
              </Button>
            )}
          </div>
        </div>
        
        {/* Appointments list */}
        {isLoadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3 mb-6"></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
                <CardContent className="border-t flex justify-between pt-2">
                  <div className="h-7 bg-muted rounded w-20"></div>
                  <div className="h-7 bg-muted rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard 
                key={appointment.id} 
                appointment={appointment}
                onUpdate={fetchAppointments}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 flex flex-col items-center justify-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <CalendarIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No appointments found</CardTitle>
              <CardDescription className="text-center max-w-md mb-6">
                {searchQuery || selectedStatus !== 'all' 
                  ? "No appointments match your search criteria. Try changing your filters."
                  : userData.role === 'student' 
                    ? "You don't have any appointments yet. Book your first appointment with a teacher."
                    : "You don't have any appointments yet. Wait for students to book appointments with you."}
              </CardDescription>
              {userData.role === 'student' && (
                <Button 
                  onClick={() => setShowNewAppointmentDialog(true)}
                >
                  Book New Appointment
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* New Appointment Dialog */}
      <Dialog 
        open={showNewAppointmentDialog} 
        onOpenChange={setShowNewAppointmentDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Book a New Appointment</DialogTitle>
            <DialogDescription>
              Fill in the details to schedule an appointment with a teacher.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teacher">Select Teacher</Label>
              <Select
                value={selectedTeacher}
                onValueChange={setSelectedTeacher}
              >
                <SelectTrigger id="teacher">
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
            
            <div className="space-y-2">
              <Label htmlFor="title">Appointment Title</Label>
              <Input
                id="title"
                placeholder="e.g., Math Homework Help"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
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
                        "w-full justify-start text-left font-normal",
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
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAppointment}
              disabled={isSubmitting}
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
