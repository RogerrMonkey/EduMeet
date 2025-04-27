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
import { toast } from 'sonner';
import { LockIcon, ShieldIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, userData, isLoading } = useAuth();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Redirect to admin dashboard if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && !isLoading && userData?.role === 'admin') {
      navigate('/admin');
    }
  }, [isAuthenticated, isLoading, userData, navigate]);
  
  // Validation
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    
    if (!password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormLoading(true);
    try {
      const user = await login(email, password);
      
      // Only allow admin login through this page
      if (user.role !== 'admin') {
        await logout();
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      
      toast.success('Admin login successful');
      navigate('/admin');
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

  // If already authenticated but not as admin
  if (isAuthenticated && userData?.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You are currently logged in as a {userData?.role}, not an admin.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button 
                onClick={async () => {
                  await logout();
                  window.location.reload();
                }} 
                className="w-full"
              >
                Sign Out and Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={formLoading}
              >
                {formLoading ? (
                  <div className="flex items-center">
                    <LockIcon className="mr-2 h-4 w-4 animate-pulse" />
                    Authenticating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LockIcon className="mr-2 h-4 w-4" />
                    Sign In as Admin
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
} 