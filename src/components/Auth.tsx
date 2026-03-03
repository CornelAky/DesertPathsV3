import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'guide'>('guide');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signIn, signUp, hasAnyAdmin } = useAuth();

  useEffect(() => {
    if (!isLogin) {
      checkAdminExists();
    }
  }, [isLogin]);

  useEffect(() => {
    const checkForPasswordReset = async () => {
      const isResetPath = window.location.pathname === '/reset-password';
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      console.log('Password reset check:', {
        isResetPath,
        hasAccessToken: !!accessToken,
        type,
        error: errorParam,
        errorDescription,
        fullHash: window.location.hash
      });

      // Check for errors in URL (e.g., invalid redirect URL)
      if (isResetPath && errorParam) {
        setError(errorDescription || errorParam || 'Authentication error occurred. Please check the link and try again.');
        console.error('Auth error from URL:', { errorParam, errorDescription });
        return;
      }

      if (isResetPath && accessToken && (type === 'recovery' || type === 'invite')) {
        console.log('Valid password reset/invite link detected');
        setIsResettingPassword(true);
        setIsInvitation(type === 'invite');
        setShowForgotPassword(false);
        setIsLogin(false);
        setError(''); // Clear any previous errors
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (isResetPath && session?.user) {
        console.log('Active session found for password reset');
        setIsResettingPassword(true);
        setShowForgotPassword(false);
        setIsLogin(false);
        setError(''); // Clear any previous errors
      } else if (isResetPath && !accessToken) {
        console.warn('Reset password path accessed without token');
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    checkForPasswordReset();

    window.addEventListener('hashchange', checkForPasswordReset);
    return () => window.removeEventListener('hashchange', checkForPasswordReset);
  }, []);

  const checkAdminExists = async () => {
    const exists = await hasAnyAdmin();
    setAdminExists(exists);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name, role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('Requesting password reset with redirect:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        throw error;
      }

      console.log('Password reset email sent successfully');
      setResetSent(true);
    } catch (err) {
      console.error('Failed to send reset email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isInvitation && !name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting password reset/invitation flow, isInvitation:', isInvitation);

      // If this is an invitation, create the user profile first
      if (isInvitation) {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });

        if (!session) {
          throw new Error('No active session found. Please try clicking the invitation link again.');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-invited-user-profile`;
        console.log('Calling complete-invited-user-profile edge function');

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: name.trim() })
        });

        const result = await response.json();
        console.log('Profile creation result:', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to create profile');
        }
      }

      // Update password
      console.log('Updating user password');
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      console.log('Password updated successfully, signing out');
      await supabase.auth.signOut();

      alert(isInvitation ? 'Account setup complete! You can now log in with your email and password.' : 'Password updated successfully! You can now log in with your new password.');
      setIsResettingPassword(false);
      setIsInvitation(false);
      setNewPassword('');
      setConfirmPassword('');
      setName('');
      setIsLogin(true);
      window.history.pushState({}, '', '/');
      window.location.reload();
    } catch (err) {
      console.error('Password reset/invitation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative"
      style={{
        backgroundImage: 'url(/login-background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center mb-6">
          <img
            src="/all_white_-_used_on_website_header_and_url.png"
            alt="Desert Paths"
            className="h-20 sm:h-24 w-auto drop-shadow-2xl"
          />
        </div>

        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl p-6 shadow-2xl mb-1">
          <p className="text-slate-800 text-lg sm:text-xl font-bold text-center mb-4">
            Book your journey with us here
          </p>
          <a
            href="https://desertpaths.co"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold px-8 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Visit desertpaths.co
          </a>
        </div>

        <div className="flex items-center justify-center -mb-4">
          <img
            src="/tourblox.png"
            alt="TourBlox"
            className="h-32 sm:h-36 w-auto drop-shadow-lg"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 pt-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-brown mb-2">
            Journey Management
          </h1>
          <p className="text-center text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base">
            {isResettingPassword ? (isInvitation ? 'Set up your account' : 'Reset your password') : isLogin ? 'Sign in to your account' : adminExists ? 'Create guide account' : 'Create admin account'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {isResettingPassword ? (
            <>
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                <p className="text-sm font-medium">{isInvitation ? 'Welcome!' : 'Password Reset Link Verified'}</p>
                <p className="text-sm">{isInvitation ? 'Please enter your full name and create a password to complete your account setup.' : 'Please enter your new password below.'}</p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                {isInvitation && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                      required
                      placeholder="Enter your full name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {isInvitation ? 'Create Password' : 'New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 sm:py-2 pr-12 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                      required
                      minLength={6}
                      placeholder={isInvitation ? "Create password (min 6 characters)" : "Enter new password (min 6 characters)"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 touch-target text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {isInvitation ? 'Confirm Password' : 'Confirm New Password'}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                    required
                    minLength={6}
                    placeholder={isInvitation ? "Confirm password" : "Confirm new password"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (isInvitation ? 'Setting up...' : 'Updating...') : (isInvitation ? 'Complete Setup' : 'Update Password')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsResettingPassword(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                    window.history.pushState({}, '', '/');
                    window.location.reload();
                  }}
                  className="w-full text-brand-orange hover:text-brand-orange-hover text-sm font-medium"
                >
                  Cancel and return to login
                </button>
              </form>
            </>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 sm:py-2 pr-12 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 touch-target text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && !adminExists && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4">
                <p className="text-sm font-medium">First User Setup</p>
                <p className="text-sm">You will be registered as an administrator.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          )}

          {!isResettingPassword && (
            <div className="mt-6 space-y-3 text-center">
              {isLogin && (
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-brand-orange hover:text-brand-orange-hover text-sm font-medium"
                >
                  Forgot password?
                </button>
              )}
              <div>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-brand-orange hover:text-brand-orange-hover text-sm font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600 mb-2">
              Are you a tour operator?
            </p>
            <a
              href="mailto:info@desertpaths.co?subject=TourBlox Journey Management System Request"
              className="text-brand-orange hover:text-brand-orange-hover font-medium text-sm inline-flex items-center gap-1 transition-colors"
            >
              Request access to TourBlox
            </a>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-brand-brown bg-opacity-20 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Reset Password</h2>
            <p className="text-sm sm:text-base text-slate-600 mb-6">
              {resetSent
                ? 'Check your email for a password reset link.'
                : 'Enter your email address and we will send you a link to reset your password.'}
            </p>

            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                  setError('');
                }}
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
