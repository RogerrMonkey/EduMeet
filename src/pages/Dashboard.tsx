import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import AppointmentCard from '@/components/AppointmentCard';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { 
  CalendarIcon, 
  MessageSquareIcon, 
  PlusIcon, 
  RefreshCwIcon, 
  UserIcon,
  ClockIcon
} from 'lucide-react';
import { AppointmentData, fetchAppointments } from '@/lib/api';

export default function Dashboard() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  
  // Redirect if not authenticated or if user is admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (userData?.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [isAuthenticated, isLoading, navigate, userData]);
  
  // Fetch recent appointments
  useEffect(() => {
    const loadAppointments = async () => {
      if (userData) {
        setIsLoadingAppointments(true);
        try {
          const appointments = await fetchAppointments(userData, undefined, 10);
          setAppointments(appointments);
        } catch (error) {
          console.error('Error loading appointments:', error);
        } finally {
          setIsLoadingAppointments(false);
        }
      }
    };
    
    loadAppointments();
  }, [userData]);
  
  const handleRefreshAppointments = async () => {
    if (userData) {
      setIsLoadingAppointments(true);
      try {
        const appointments = await fetchAppointments(userData, undefined, 10);
        setAppointments(appointments);
      } catch (error) {
        console.error('Error refreshing appointments:', error);
      } finally {
        setIsLoadingAppointments(false);
      }
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
            New Appointment
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="animate-slide-up animation-delay-150">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks you might want to do</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="justify-start" 
                onClick={() => navigate('/appointments')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                View All Appointments
              </Button>
              <Button 
                variant="outline" 
                className="justify-start" 
                onClick={() => navigate('/messages')}
              >
                <MessageSquareIcon className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button 
                variant="outline" 
                className="justify-start" 
                onClick={() => navigate('/profile')}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profile Settings
              </Button>
              {userData.role === 'teacher' && (
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => navigate('/appointments?tab=availability')}
                >
                  <ClockIcon className="mr-2 h-4 w-4" />
                  Manage Availability
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2 animate-slide-up animation-delay-300">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                <CardDescription>Your next scheduled appointments</CardDescription>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleRefreshAppointments}
                disabled={isLoadingAppointments}
              >
                <RefreshCwIcon className={`h-4 w-4 ${isLoadingAppointments ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="pb-2">
              {isLoadingAppointments ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse text-lg font-medium">Loading appointments...</div>
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.slice(0, 3).map((appointment) => (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment}
                      onStatusChange={handleRefreshAppointments}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You don't have any upcoming appointments</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => navigate('/appointments/new')}
                  >
                    Schedule your first appointment
                  </Button>
                </div>
              )}
            </CardContent>
            {appointments.length > 3 && (
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/appointments')}
                >
                  View all appointments
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
