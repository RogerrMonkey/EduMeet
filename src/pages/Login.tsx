import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { login, currentUser, sendPasswordReset } = useAuth();

  // Redirect if user is already logged in
  if (currentUser) {
    navigate('/dashboard');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Logged in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
      toast.success('Password reset email sent');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send password reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {forgotPassword ? 'Reset Password' : 'Login'}
          </CardTitle>
          <CardDescription className="text-center">
            {forgotPassword 
              ? 'Enter your email to receive a password reset link' 
              : 'Enter your credentials to access your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetSent && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <AlertDescription>
                Password reset email sent! Check your inbox for further instructions.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={forgotPassword ? handlePasswordReset : handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              {!forgotPassword && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button 
                      type="button" 
                      className="text-sm text-primary hover:underline" 
                      onClick={() => setForgotPassword(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}
              
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {forgotPassword ? 'Send Reset Link' : 'Login'}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {forgotPassword ? (
            <Button 
              variant="link" 
              className="px-0 w-full" 
              onClick={() => setForgotPassword(false)}
            >
              Back to login
            </Button>
          ) : (
            <div className="text-center text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Register
              </Link>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 