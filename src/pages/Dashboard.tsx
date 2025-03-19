
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, collections, appointmentStatus, logEvent } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import AppointmentCard, { AppointmentData } from '@/components/AppointmentCard';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  CalendarIcon, 
  MessageSquareIcon, 
  PlusIcon, 
  RefreshCwIcon, 
  UserIcon 
} from 'lucide-react';

export default function Dashboard() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  // Fetch appointments based on user role
  const fetchAppointments = async () => {
    if (!userData) return;
    
    setIsLoadingAppointments(true);
    try {
      const appointmentsRef = collection(db, collections.appointments);
      let q;
      
      if (userData.role === 'student') {
        q = query(
          appointmentsRef,
          where('studentId', '==', userData.uid),
          orderBy('date', 'asc'),
          limit(10)
        );
      } else if (userData.role === 'teacher') {
        q = query(
          appointmentsRef,
          where('teacherId', '==', userData.uid),
          orderBy('date', 'asc'),
          limit(10)
        );
      } else if (userData.role === 'admin') {
        q = query(
          appointmentsRef,
          orderBy('date', 'asc'),
          limit(10)
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
    } finally {
      setIsLoadingAppointments(false);
    }
  };
  
  useEffect(() => {
    if (userData) {
      fetchAppointments();
    }
  }, [userData]);
  
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold animate-slide-up">Welcome, {userData.displayName}</h1>
            <p className="text-muted-foreground animate-slide-up animation-delay-150">
              {userData.role === 'student' 
                ? 'Manage your appointments with teachers' 
                : 'Manage your student appointments'}
            </p>
          </div>
          
          <Button 
            className="animate-slide-up animation-delay-300 flex items-center gap-2"
            onClick={() => navigate('/appointments/new')}
          >
            <PlusIcon className="h-4 w-4" />
            {userData.role === 'student' ? 'Book Appointment' : 'Schedule Time'}
          </Button>
        </div>
        
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="animate-slide-up animation-delay-150">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {appointments.filter(a => 
                    a.status === appointmentStatus.APPROVED || 
                    a.status === appointmentStatus.PENDING
                  ).length}
                </div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <CalendarIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-slide-up animation-delay-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Unread Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">0</div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <MessageSquareIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="animate-slide-up animation-delay-450">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {userData.role === 'student' ? 'Teachers' : 'Students'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">-</div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <UserIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Appointments */}
        <section className="animate-slide-up animation-delay-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Appointments</h2>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={fetchAppointments}
              disabled={isLoadingAppointments}
            >
              <RefreshCwIcon className={`h-4 w-4 ${isLoadingAppointments ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {isLoadingAppointments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
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
          ) : appointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointments.map((appointment) => (
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
                  {userData.role === 'student' 
                    ? "You don't have any appointments yet. Book your first appointment with a teacher."
                    : "You don't have any appointments yet. Create your availability to let students book appointments."}
                </CardDescription>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => navigate('/appointments/new')}
                >
                  <PlusIcon className="h-4 w-4" />
                  {userData.role === 'student' ? 'Book Appointment' : 'Schedule Time'}
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
