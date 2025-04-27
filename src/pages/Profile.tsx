import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { userRoles, auth, logEvent, collections, db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import { 
  ArrowLeftIcon, 
  UserIcon, 
  PhoneIcon, 
  MailIcon,
  KeyIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  Loader2Icon,
  BookIcon,
  GraduationCapIcon,
  ShieldIcon,
  BuildingIcon,
  BookOpenIcon
} from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { collection, query, where, getDocs } from 'firebase/firestore';

interface FormErrors {
  displayName?: string;
  phoneNumber?: string;
  department?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface Stats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
}

export default function Profile() {
  const { isAuthenticated, isLoading, userData, updateUserData, currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Stats states
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  
  // Load user data
  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
      setPhoneNumber(userData.phoneNumber || '');
      setDepartment(userData.department || '');
      setSubjects(userData.subjects || []);
      
      // Fetch stats for the user
      fetchUserStats();
    }
  }, [userData]);
  
  // Redirect if not authenticated or redirect to role-specific profile
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (userData?.role === 'admin') {
        // Admin users should be redirected to admin dashboard
        navigate('/admin');
      } else if (userData && window.location.pathname === '/profile') {
        // Redirect to role-specific profile page
        switch (userData.role) {
          case 'teacher':
            navigate('/teacher/profile');
            break;
          case 'student':
            navigate('/student/profile');
            break;
        }
      }
    }
  }, [isAuthenticated, isLoading, navigate, userData]);
  
  // Fetch user stats based on role
  const fetchUserStats = async () => {
    if (!userData) return;
    
    setIsLoadingStats(true);
    try {
      const appointmentsRef = collection(db, collections.appointments);
      let q;
      
      if (userData.role === 'student') {
        q = query(
          appointmentsRef,
          where('studentId', '==', userData.uid)
        );
      } else if (userData.role === 'teacher') {
        q = query(
          appointmentsRef,
          where('teacherId', '==', userData.uid)
        );
      } else if (userData.role === 'admin') {
        q = query(appointmentsRef);
      }
      
      if (q) {
        const querySnapshot = await getDocs(q);
        let total = 0;
        let pending = 0;
        let completed = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as { status: string };
          total++;
          
          if (data.status === 'pending') {
            pending++;
          } else if (data.status === 'completed') {
            completed++;
          }
        });
        
        setStats({
          totalAppointments: total,
          pendingAppointments: pending,
          completedAppointments: completed
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  // Validate profile form
  const validateProfileForm = () => {
    const newErrors: FormErrors = {};
    
    if (!displayName) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    }
    
    if (userData?.role === 'teacher' && !department) {
      newErrors.department = 'Department is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Validate password form
  const validatePasswordForm = () => {
    const newErrors: FormErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) return;
    
    setIsUpdating(true);
    try {
      const updateData: any = {
        displayName,
        phoneNumber,
      };
      
      // Only include these fields for teachers
      if (userData?.role === 'teacher') {
        updateData.department = department;
        updateData.subjects = subjects;
      }
      
      await updateUserData(updateData);
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setIsChangingPassword(true);
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      try {
        // Reauthenticate the user
        const credential = EmailAuthProvider.credential(
          currentUser.email || '',
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (authError: any) {
        console.error('Auth error:', authError);
        
        if (authError.code === 'auth/wrong-password') {
          setErrors({
            ...errors,
            currentPassword: 'Current password is incorrect'
          });
        } else if (authError.code === 'auth/requires-recent-login') {
          setShowReauthDialog(true);
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  // Handle reauthentication
  const handleReauthenticate = async () => {
    if (!reauthPassword) {
      toast.error('Please enter your password');
      return;
    }
    
    setIsReauthenticating(true);
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      const credential = EmailAuthProvider.credential(
        currentUser.email || '',
        reauthPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      setShowReauthDialog(false);
      setReauthPassword('');
      
      toast.success('Reauthenticated successfully. You can now change your password.');
    } catch (error: any) {
      console.error('Reauthentication error:', error);
      
      if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else {
        toast.error('Failed to reauthenticate');
      }
    } finally {
      setIsReauthenticating(false);
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!userData?.displayName) return 'U';
    return userData.displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get role icon based on user role
  const getRoleIcon = () => {
    switch (userData?.role) {
      case 'admin':
        return <ShieldIcon className="h-7 w-7 text-amber-500" />;
      case 'teacher':
        return <BookIcon className="h-7 w-7 text-emerald-500" />;
      case 'student':
        return <GraduationCapIcon className="h-7 w-7 text-blue-500" />;
      default:
        return <UserIcon className="h-7 w-7 text-primary" />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 rounded-full"
            onClick={() => {
              if (userData?.role === 'admin') {
                navigate('/admin');
              } else {
                navigate('/dashboard');
              }
            }}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Your Profile</h1>
            <p className="text-sm text-muted-foreground">
              View and update your profile information
            </p>
          </div>
        </div>
        
        <div className="grid gap-6">
          {/* User Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={userData?.photoURL} />
                  <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{userData?.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{userData?.email}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <div className="px-2 py-0.5 bg-primary/10 rounded-full text-primary capitalize">
                      {userData?.role}
                    </div>
                    {userData?.status && (
                      <div className={`px-2 py-0.5 rounded-full capitalize ${
                        userData.status === 'approved' ? 'bg-green-500/10 text-green-600' : 
                        userData.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 
                        'bg-red-500/10 text-red-600'
                      }`}>
                        {userData.status}
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-14 w-14 bg-primary/5 rounded-full flex items-center justify-center">
                  {getRoleIcon()}
                </div>
              </div>
              
              {/* Role-specific info section */}
              {userData?.role === 'teacher' && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center text-sm">
                      <BuildingIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground mr-1">Department:</span>
                      <span className="font-medium">{userData.department || 'Not specified'}</span>
                    </div>
                    
                    <Separator orientation="vertical" className="h-5 mx-2" />
                    
                    <div className="flex flex-wrap gap-1 items-center text-sm">
                      <BookOpenIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground mr-1">Subjects:</span>
                      {userData.subjects && userData.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userData.subjects.map((subject, index) => (
                            <Badge key={index} variant="outline" className="bg-primary/5">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="font-medium">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stats section for all users */}
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Activity Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">
                      {isLoadingStats ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        stats.totalAppointments
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Appointments
                    </div>
                  </div>
                  <div className="bg-yellow-500/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-600">
                      {isLoadingStats ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        stats.pendingAppointments
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pending
                    </div>
                  </div>
                  <div className="bg-green-500/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">
                      {isLoadingStats ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        stats.completedAppointments
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Profile Edit and Password Tabs */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Information</TabsTrigger>
              <TabsTrigger value="password">Change Password</TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleProfileUpdate}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Full Name</Label>
                      <div className="relative">
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your full name"
                          className="pl-10"
                        />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      {errors.displayName && (
                        <p className="text-sm text-destructive">{errors.displayName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          value={userData?.email}
                          disabled
                          className="pl-10 opacity-70"
                        />
                        <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed directly. Contact support if needed.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="relative">
                        <Input
                          id="phoneNumber"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Enter your phone number"
                          className="pl-10"
                        />
                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                      )}
                    </div>
                    
                    {/* Teacher-specific fields */}
                    {userData?.role === 'teacher' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <div className="relative">
                            <Input
                              id="department"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              placeholder="Enter your department"
                              className="pl-10"
                            />
                            <BuildingIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                          {errors.department && (
                            <p className="text-sm text-destructive">{errors.department}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                          <div className="relative">
                            <Input
                              id="subjects"
                              value={subjects.join(', ')}
                              onChange={(e) => setSubjects(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="e.g., Mathematics, Physics, Chemistry"
                              className="pl-10"
                            />
                            <BookOpenIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter subjects you teach, separated by commas
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="border-t py-4">
                    <Button type="submit" className="ml-auto" disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <SaveIcon className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Password Tab */}
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your account password
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handlePasswordChange}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="pl-10"
                        />
                        <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.currentPassword && (
                        <p className="text-sm text-destructive">{errors.currentPassword}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter your new password"
                          className="pl-10"
                        />
                        <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOffIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.newPassword && (
                        <p className="text-sm text-destructive">{errors.newPassword}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your new password"
                          className="pl-10"
                        />
                        <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t py-4">
                    <Button type="submit" className="ml-auto" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <KeyIcon className="mr-2 h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Reauthentication Dialog */}
      <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authenticate Required</DialogTitle>
            <DialogDescription>
              For security reasons, please enter your password to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reauthPassword">Password</Label>
              <div className="relative">
                <Input
                  id="reauthPassword"
                  type={showReauthPassword ? 'text' : 'password'}
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10"
                />
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowReauthPassword(!showReauthPassword)}
                >
                  {showReauthPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReauthDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReauthenticate} disabled={isReauthenticating}>
              {isReauthenticating ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Authenticate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 