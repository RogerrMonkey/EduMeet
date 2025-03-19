
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeftIcon, Loader2Icon, LogInIcon, UserPlusIcon } from 'lucide-react';
import { logEvent, userRoles } from '@/lib/firebase';

export default function Auth() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the mode from URL (login or register)
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  // Update URL when mode changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    newParams.set('mode', mode);
    navigate({ search: newParams.toString() }, { replace: true });
  }, [mode, navigate]);
  
  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (mode === 'register') {
      if (!displayName) newErrors.displayName = 'Name is required';
      if (!role) newErrors.role = 'Role is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        logEvent('User logged in', { email });
        toast.success('Successfully logged in');
      } else {
        await register(email, password, role, displayName);
        logEvent('User registered', { email, role });
        toast.success('Account created successfully');
      }
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Authentication error:', error);
      logEvent('Authentication error', { error: error.message, mode });
      
      let errorMessage = 'Authentication failed';
      
      // Parse Firebase error messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle between login and register
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="flex items-center gap-1">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-scale-in">
          <Card className="border shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {mode === 'login' ? 'Sign in' : 'Create an account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login' 
                  ? 'Enter your credentials to access your account' 
                  : 'Fill in the details to create your new account'}
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter your full name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      error={!!errors.displayName}
                    />
                    {errors.displayName && (
                      <p className="text-sm text-destructive">{errors.displayName}</p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!errors.email}
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
                    error={!!errors.password}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                {mode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="role">I am a</Label>
                    <Select
                      value={role}
                      onValueChange={(value: 'student' | 'teacher') => setRole(value)}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-destructive">{errors.role}</p>
                    )}
                  </div>
                )}
                
                {mode === 'login' && (
                  <div className="text-sm text-right">
                    <Link 
                      to="/forgot-password" 
                      className="text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? (
                        <>
                          <LogInIcon className="mr-2 h-4 w-4" />
                          Sign in
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="mr-2 h-4 w-4" />
                          Create account
                        </>
                      )}
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-center text-muted-foreground">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    className="ml-1 text-primary hover:underline focus:outline-none"
                    onClick={toggleMode}
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
