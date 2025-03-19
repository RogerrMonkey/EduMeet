
import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, appointmentStatus, logEvent } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, CheckIcon, ClockIcon, MessageSquareIcon, TrashIcon, UserIcon, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface AppointmentCardProps {
  appointment: AppointmentData;
  onUpdate?: () => void;
}

export default function AppointmentCard({ appointment, onUpdate }: AppointmentCardProps) {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Convert Firestore timestamp to Date if needed
  const getDate = (date: Date | { seconds: number; nanoseconds: number }): Date => {
    if (date instanceof Date) return date;
    return new Date((date.seconds) * 1000);
  };
  
  const formattedDate = format(getDate(appointment.date), 'MMMM d, yyyy');
  const formattedTime = format(getDate(appointment.date), 'h:mm a');
  
  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case appointmentStatus.APPROVED:
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case appointmentStatus.CANCELLED:
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case appointmentStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case appointmentStatus.PENDING:
      default:
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
    }
  };
  
  // Check if the current user can perform actions
  const isTeacher = userData?.role === 'teacher' && userData.uid === appointment.teacherId;
  const isStudent = userData?.role === 'student' && userData.uid === appointment.studentId;
  const canApprove = isTeacher && appointment.status === appointmentStatus.PENDING;
  const canCancel = (isTeacher || isStudent) && 
    (appointment.status === appointmentStatus.PENDING || appointment.status === appointmentStatus.APPROVED);
  const canDelete = isTeacher || isStudent;
  
  // Handle status updates
  const updateAppointmentStatus = async (status: string) => {
    if (!appointment.id) return;
    
    setIsLoading(true);
    try {
      const appointmentRef = doc(db, 'appointments', appointment.id);
      await updateDoc(appointmentRef, { 
        status,
        updatedAt: new Date()
      });
      
      logEvent('Appointment status updated', { appointmentId: appointment.id, status });
      toast.success(`Appointment ${status.toLowerCase()} successfully`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle appointment deletion
  const deleteAppointment = async () => {
    if (!appointment.id) return;
    
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'appointments', appointment.id));
      logEvent('Appointment deleted', { appointmentId: appointment.id });
      toast.success('Appointment deleted successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{appointment.title}</CardTitle>
          <Badge 
            className={cn(
              "ml-2 transition-colors",
              getStatusColor(appointment.status)
            )}
          >
            {appointment.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 text-sm">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
          {formattedDate}
          <span className="mx-1">•</span>
          <ClockIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
          {formattedTime}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{appointment.description}</p>
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="text-sm font-medium">{appointment.studentName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Teacher</p>
              <p className="text-sm font-medium">{appointment.teacherName}</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex flex-wrap gap-2">
        {canApprove && (
          <Button 
            variant="outline" 
            size="sm"
            className="flex gap-1.5"
            onClick={() => updateAppointmentStatus(appointmentStatus.APPROVED)}
            disabled={isLoading}
          >
            <CheckIcon className="h-4 w-4" />
            Approve
          </Button>
        )}
        
        {canCancel && (
          <Button 
            variant="outline" 
            size="sm"
            className="flex gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => updateAppointmentStatus(appointmentStatus.CANCELLED)}
            disabled={isLoading}
          >
            <XIcon className="h-4 w-4" />
            Cancel
          </Button>
        )}
        
        <Button variant="ghost" size="sm" className="flex gap-1.5 ml-auto">
          <MessageSquareIcon className="h-4 w-4" />
          Message
        </Button>
        
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex gap-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this appointment. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={deleteAppointment}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
