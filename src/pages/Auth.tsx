import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { toast } from 'sonner';
import { userRoles } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  phoneNumber?: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, logout, isAuthenticated, userData, isLoading } = useAuth();
  
  // Get mode from URL query parameters
  const getInitialMode = () => {
    const params = new URLSearchParams(location.search);
    return params.get('mode') === 'register' ? 'register' : 'login';
  };
  
  // Check if session expired flag is set
  const isSessionExpired = () => {
    const params = new URLSearchParams(location.search);
    return params.get('sessionExpired') === 'true';
  };
  
  // Form states
  const [mode, setMode] = useState<'login' | 'register'>(getInitialMode);
  const [sessionExpired, setSessionExpired] = useState(isSessionExpired());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Update when URL changes
  useEffect(() => {
    setMode(getInitialMode());
    setSessionExpired(isSessionExpired());
  }, [location.search]);

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoading && userData) {
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, userData, navigate]);
  
  // Show toast notification for expired session
  useEffect(() => {
    if (sessionExpired) {
      toast.error('Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);
  
  // Update URL when mode changes
  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    navigate(`/auth?mode=${newMode}`, { replace: true });
  };
  
  // Validation
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (mode === 'register') {
      if (!displayName) newErrors.displayName = 'Full name is required';
      if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
      else if (!/^\+?[\d\s-]{10,}$/.test(phoneNumber)) {
        newErrors.phoneNumber = 'Invalid phone number format';
      }
      if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormLoading(true);
    try {
      if (mode === 'login') {
        const userData = await login(email, password);
        
        // If a teacher tries to login through the student page, redirect them to teacher login
        if (userData.role === userRoles.TEACHER) {
          toast.info('Please use the teacher login page');
          await logout();
          navigate('/teacher/login');
          return;
        }
        
        if (userData.role === userRoles.ADMIN) {
          toast.error('Admin login is not allowed here');
          await logout();
          navigate('/admin/login');
          return;
        }
        
        // Handle regular user login
        if (userData.status === 'approved') {
          navigate('/dashboard');
        } else {
          // Logout user if not approved
          toast.error('Your account is pending approval from admin');
          await logout();
        }
      } else {
        // Register as student
        const userData = await register(email, password, 'student', displayName, phoneNumber);
        
        // If student registration is pending approval, inform the user and sign them out
        if (userData.status === 'pending') {
          toast.success('Registration submitted! Please wait for admin approval.');
          await logout();
          setMode('login');
        } else {
          toast.success('Registration successful!');
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setFormLoading(false);
    }
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="animate-pulse text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">
              {mode === 'login' ? 'Student Login' : 'Student Registration'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' 
                ? 'Enter your credentials to access your student dashboard'
                : 'Create a new student account to book appointments with teachers'}
            </CardDescription>
            
            {sessionExpired && mode === 'login' && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Session expired</AlertTitle>
                <AlertDescription>
                  Your session has expired. Please sign in again to continue.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter your full name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      aria-invalid={!!errors.displayName}
                    />
                    {errors.displayName && (
                      <p className="text-sm text-destructive">{errors.displayName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="Enter your phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      aria-invalid={!!errors.phoneNumber}
                    />
                    {errors.phoneNumber && (
                      <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                    )}
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={formLoading}
              >
                {formLoading 
                  ? 'Please wait...' 
                  : mode === 'login' ? 'Sign In' : 'Submit Registration'}
              </Button>
              
              <div className="flex items-center justify-center w-full text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' 
                    ? "Don't have an account? Register as a student" 
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </CardFooter>
          </form>
          
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' 
                ? (
                  <>
                    Are you a teacher? <a href="/teacher/login" className="text-primary hover:underline">Sign in here</a>
                  </>
                ) 
                : (
                  <>
                    Already have an account? <a href="/auth?mode=login" className="text-primary hover:underline">Sign in</a>
                  </>
                )}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
