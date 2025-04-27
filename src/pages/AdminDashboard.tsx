import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from 'sonner';
import { PlusIcon, Loader2Icon, CheckIcon, XIcon, TrashIcon, PencilIcon, RefreshCwIcon } from 'lucide-react';
import { fetchTeachers, fetchPendingStudents, updateStudentStatus, deleteTeacher, TeacherData, StudentData } from '@/lib/api';
import { initializeApp } from 'firebase/app';

// Firebase config for temporary auth instance
const firebaseConfig = {
  apiKey: "AIzaSyD-rU_E8QIb_enSJriKXdVwfS4veqcyJVk",
  authDomain: "student-teacher-appointm-59cd5.firebaseapp.com",
  projectId: "student-teacher-appointm-59cd5",
  storageBucket: "student-teacher-appointm-59cd5.firebasestorage.app",
  messagingSenderId: "1033956053587",
  appId: "1:1033956053587:web:cb0c4b17ecf926df6b2ca6",
  measurementId: "G-BY4PCGL2SZ"
};

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [pendingStudents, setPendingStudents] = useState<StudentData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showAddTeacherDialog, setShowAddTeacherDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null);
  
  // Form states
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userData?.role !== 'admin')) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, userData, navigate]);
  
  // Fetch teachers and pending students
  useEffect(() => {
    if (userData?.role === 'admin') {
      loadTeachers();
      loadPendingStudents();
    }
  }, [userData]);
  
  // Load teachers
  const loadTeachers = async () => {
    try {
      setIsLoadingData(true);
      const teachersData = await fetchTeachers();
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setIsLoadingData(false);
    }
  };
  
  // Load pending students
  const loadPendingStudents = async () => {
    try {
      const studentsData = await fetchPendingStudents();
      setPendingStudents(studentsData);
    } catch (error) {
      console.error('Error loading pending students:', error);
      toast.error('Failed to load pending students');
    }
  };
  
  // Handle student approval/rejection
  const handleStudentStatus = async (studentId: string, status: 'approved' | 'rejected') => {
    if (!userData) return;
    
    try {
      setIsLoadingData(true);
      await updateStudentStatus(studentId, status, userData.uid);
      toast.success(`Student ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      loadPendingStudents();
    } catch (error) {
      console.error('Error updating student status:', error);
      
      // More detailed error message
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          toast.error('Permission denied. Make sure you have admin privileges and Firebase security rules are properly set.');
        } else {
          toast.error(`Failed to update student status: ${error.message}`);
        }
      } else {
        toast.error('Failed to update student status');
      }
    } finally {
      setIsLoadingData(false);
    }
  };
  
  // Handle teacher deletion
  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteTeacher(teacherId);
      toast.success('Teacher deleted successfully');
      loadTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast.error('Failed to delete teacher');
    }
  };
  
  // Reset form
  const resetForm = () => {
    setTeacherName('');
    setTeacherEmail('');
    setTeacherPhone('');
    setDepartment('');
    setSubjects([]);
    setTeacherPassword('');
    setEditingTeacher(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const teacherData = {
        displayName: teacherName,
        email: teacherEmail,
        phoneNumber: teacherPhone,
        department,
        subjects,
        role: 'teacher' as const,
        status: 'approved',
        createdAt: Date.now(),
      };
      
      if (editingTeacher) {
        // Update existing teacher
        await updateDoc(doc(db, 'users', editingTeacher.uid), teacherData);

        // If email changed, need to update in Auth as well
        if (editingTeacher.email !== teacherEmail && teacherPassword) {
          try {
            // This would require reauthentication in a real app
            // For this demo, we'll just create a new user and delete the old one
            const { user } = await createUserWithEmailAndPassword(
              auth,
              teacherEmail,
              teacherPassword
            );
            
            // Update the UID in Firestore to match the new Auth user
            await setDoc(doc(db, 'users', user.uid), {
              ...teacherData,
              uid: user.uid,
            });
            
            // Delete the old document
            await deleteTeacher(editingTeacher.uid);
            
            // Sign out the user we just created to avoid replacing the admin session
            await signOut(auth);
            
            toast.success('Teacher updated with new credentials');
          } catch (authError: any) {
            console.error('Error updating teacher auth:', authError);
            if (authError.code === 'auth/email-already-in-use') {
              toast.error('Email is already in use by another account');
            } else {
              toast.error('Failed to update teacher authentication');
            }
          }
        } else {
          toast.success('Teacher updated successfully');
        }
      } else {
        // Create new teacher
        try {
          // First get reference to the current admin user
          const adminAuth = auth.currentUser;
          
          // Create a temporary auth instance to create the teacher
          const tempAuth = getAuth(initializeApp(firebaseConfig, "tempApp"));
          
          // Create Auth account using the temporary auth instance
          const { user } = await createUserWithEmailAndPassword(
            tempAuth,
            teacherEmail,
            teacherPassword
          );

          // Create Firestore document
          await setDoc(doc(db, 'teachers', user.uid), {
            ...teacherData,
            uid: user.uid,
          });

          // Sign out from the temporary auth instance
          await signOut(tempAuth);
          
          toast.success('Teacher created successfully');
          
          // Reset form
          resetForm();
          
          // Hide dialog
          setShowAddTeacherDialog(false);
        } catch (authError: any) {
          console.error('Error creating teacher auth:', authError);
          if (authError.code === 'auth/email-already-in-use') {
            toast.error('Email is already in use by another account');
          } else {
            toast.error(`Failed to create teacher: ${authError.message}`);
          }
        }
      }
      
      // Reload teachers
      loadTeachers();
    } catch (error) {
      console.error('Error submitting teacher:', error);
      toast.error('Failed to submit teacher data');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Set form data for editing
  const handleEditTeacher = (teacher: TeacherData) => {
    setEditingTeacher(teacher);
    setTeacherName(teacher.displayName);
    setTeacherEmail(teacher.email);
    setTeacherPhone(teacher.phoneNumber || '');
    setDepartment(teacher.department || '');
    setSubjects(teacher.subjects || []);
    setTeacherPassword(''); // Don't set the password
    setShowAddTeacherDialog(true);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }
  
  // Render admin dashboard
  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage teachers and approve student registrations
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="teachers">
          <TabsList className="mb-4">
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="students">
              Pending Students
              {pendingStudents.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {pendingStudents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manage Teachers</h2>
              
              <Dialog open={showAddTeacherDialog} onOpenChange={setShowAddTeacherDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingTeacher
                          ? 'Update the teacher information below'
                          : 'Create a new teacher account with login credentials'}
                    </DialogDescription>
                  </DialogHeader>
                  
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          value={teacherName}
                          onChange={(e) => setTeacherName(e.target.value)}
                          className="col-span-3"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                          className="col-span-3"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                          Password
                        </Label>
                        <div className="col-span-3 relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={teacherPassword}
                            onChange={(e) => setTeacherPassword(e.target.value)}
                            className="pr-10"
                            placeholder={editingTeacher ? '(keep current)' : ''}
                            required={!editingTeacher}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">
                          Phone
                        </Label>
                        <Input
                          id="phone"
                          value={teacherPhone}
                          onChange={(e) => setTeacherPhone(e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="department" className="text-right">
                          Department
                        </Label>
                        <Input
                          id="department"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="subjects" className="text-right">
                          Subjects
                        </Label>
                        <Input
                          id="subjects"
                          value={subjects.join(', ')}
                          onChange={(e) => {
                            const subjectList = e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean);
                            setSubjects(subjectList);
                          }}
                          placeholder="Comma separated list"
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          resetForm();
                          setShowAddTeacherDialog(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>{editingTeacher ? 'Update Teacher' : 'Add Teacher'}</>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {isLoadingData ? (
              <div className="py-10 text-center">
                <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading teachers...</p>
              </div>
            ) : teachers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => (
                <Card key={teacher.uid}>
                  <CardHeader>
                    <CardTitle>{teacher.displayName}</CardTitle>
                      <CardDescription>{teacher.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {teacher.phoneNumber && (
                        <p className="text-sm text-muted-foreground">
                          Phone: {teacher.phoneNumber}
                        </p>
                      )}
                      {teacher.department && (
                        <p className="text-sm text-muted-foreground">
                          Department: {teacher.department}
                        </p>
                      )}
                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Subjects:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {teacher.subjects.map((subject, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-secondary rounded"
                              >
                                {subject}
                              </span>
                            ))}
                      </div>
                    </div>
                      )}
                  </CardContent>
                    <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                        onClick={() => handleEditTeacher(teacher)}
                    >
                        <PencilIcon className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTeacher(teacher.uid)}
                    >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Remove
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">No teachers found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowAddTeacherDialog(true)}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Your First Teacher
                  </Button>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
          
          <TabsContent value="students">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Pending Student Approvals</h2>
              <p className="text-muted-foreground">
                Review and approve student registration requests
              </p>
            </div>
            
            {isLoadingData ? (
              <div className="py-10 text-center">
                <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading pending students...</p>
              </div>
            ) : pendingStudents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingStudents.map((student) => (
                <Card key={student.uid}>
                  <CardHeader>
                    <CardTitle>{student.displayName}</CardTitle>
                      <CardDescription>{student.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {student.phoneNumber && (
                        <p className="text-sm text-muted-foreground">
                          Phone: {student.phoneNumber}
                        </p>
                      )}
                      <p className="text-sm font-medium mt-2">
                        Status:{' '}
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Pending Approval
                        </span>
                      </p>
                  </CardContent>
                    <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                        className="text-green-600 border-green-600"
                      onClick={() => handleStudentStatus(student.uid, 'approved')}
                    >
                        <CheckIcon className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                        variant="outline"
                      size="sm"
                        className="text-destructive border-destructive"
                      onClick={() => handleStudentStatus(student.uid, 'rejected')}
                    >
                        <XIcon className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">No pending student approvals</p>
                  <Button variant="outline" className="mt-4" onClick={loadPendingStudents}>
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    Refresh List
                  </Button>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 