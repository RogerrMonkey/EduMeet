import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { EyeIcon, EyeOffIcon, KeyIcon, MailIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { userRoles } from '@/lib/firebase';

export default function TeacherLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; general?: string}>({});
  
  // Validate form
  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const userData = await login(email, password);
      
      // Check if user is a teacher
      if (userData.role !== userRoles.TEACHER) {
        toast.error('Access denied. Only teachers can login here.');
        // Sign out the user since they're not a teacher
        await logout();
        setIsLoading(false);
        return;
      }
      
      // Redirect to dashboard on successful login
      toast.success('Login successful! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500); // Short delay for the toast to be visible
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to login. Please check your credentials.';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }
      
      setErrors({
        general: errorMessage
      });
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container flex items-center justify-center py-20">
        <div className="w-full max-w-md">
          <Card className="border shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Teacher Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your teacher dashboard
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                    />
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                {errors.general && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                    {errors.general}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </CardFooter>
            </form>
          </Card>
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Not a teacher? <a href="/auth" className="text-primary hover:underline">Sign in as student</a> or <a href="/admin/login" className="text-amber-600 hover:underline">admin</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 