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
  onStatusChange?: () => void;
  compact?: boolean;
}

export default function AppointmentCard({ appointment, onStatusChange, compact }: AppointmentCardProps) {
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
  
  // Card background color based on status
  const getCardBackground = (status: string) => {
    switch (status) {
      case appointmentStatus.APPROVED:
        return 'bg-green-50/50 hover:bg-green-50/80';
      case appointmentStatus.CANCELLED:
        return 'bg-red-50/50 hover:bg-red-50/80';
      case appointmentStatus.COMPLETED:
        return 'bg-blue-50/50 hover:bg-blue-50/80';
      case appointmentStatus.PENDING:
      default:
        return 'bg-amber-50/50 hover:bg-amber-50/80';
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
      if (onStatusChange) onStatusChange();
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
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-md border-l-4",
      getCardBackground(appointment.status),
      appointment.status === appointmentStatus.PENDING && "border-l-amber-400",
      appointment.status === appointmentStatus.APPROVED && "border-l-green-400",
      appointment.status === appointmentStatus.CANCELLED && "border-l-red-400",
      appointment.status === appointmentStatus.COMPLETED && "border-l-blue-400",
      compact && "shadow-sm"
    )}>
      <CardHeader className={cn("pb-2", compact && "p-4")}>
        <div className="flex justify-between items-start">
          <CardTitle className={cn("text-xl group flex items-center gap-2", compact && "text-lg")}>
            <span className="line-clamp-1">{appointment.title}</span>
            {new Date(getDate(appointment.date)).getTime() > new Date().getTime() && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full animate-pulse">
                Upcoming
              </span>
            )}
          </CardTitle>
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
      
      <CardContent className={cn("pb-2", compact && "p-4 pt-0")}>
        {!compact ? (
          <>
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
          </>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground truncate max-w-[200px]">{appointment.description}</p>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {isStudent ? appointment.teacherName : appointment.studentName}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className={cn("pt-2 flex flex-wrap gap-2", compact && "p-4 pt-2")}>
        {canApprove && (
          <Button 
            variant="outline" 
            size="sm"
            className="flex gap-1.5 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"
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
        
        {!compact && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex gap-1.5 ml-auto hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
          <MessageSquareIcon className="h-4 w-4" />
          Message
        </Button>
        )}
        
        {canDelete && !compact && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-l-4 border-l-destructive">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete this appointment. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={deleteAppointment}
                  className="bg-destructive hover:bg-destructive/90"
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
