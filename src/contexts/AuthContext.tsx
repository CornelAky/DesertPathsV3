import { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/database.types';
import { logger } from '../lib/logger';

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: 'admin' | 'guide') => Promise<void>;
  signOut: () => Promise<void>;
  hasAnyAdmin: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('Auth state change:', event, session?.user?.id);

        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery detected, setting user without profile check');
          setUser(session?.user ?? null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        // Handle invitation acceptance - user is signed in but may not have profile yet
        if (event === 'SIGNED_IN' && session?.user) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const type = hashParams.get('type');

          if (type === 'invite') {
            console.log('Invitation acceptance detected, setting user without profile check');
            setUser(session.user);
            setUserProfile(null);
            setLoading(false);
            return;
          }
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, status, approved_at, approved_by, rejected_at, rejection_reason, phone_number, job_title, bio, profile_picture_url, profile_image_url, deleted_at, deleted_by, tour_license_url, tour_license_expiry, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // Check if user is deleted
      if (data && data.deleted_at) {
        await supabase.auth.signOut();
        setUser(null);
        setUserProfile(null);
        throw new Error('This account has been deleted. Please contact an administrator for more information.');
      }

      // Check if user status is pending or rejected
      if (data && (data.status === 'pending' || data.status === 'rejected')) {
        // Sign out pending/rejected users
        await supabase.auth.signOut();
        setUser(null);
        setUserProfile(null);

        if (data.status === 'pending') {
          throw new Error('Your account is pending admin approval. Please wait for an administrator to approve your account.');
        } else {
          throw new Error('Your account has been rejected. Please contact an administrator for more information.');
        }
      }

      setUserProfile(data);
    } catch (error) {
      logger.error('Error fetching user profile', error as Error, { userId });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const hasAnyAdmin = async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('has_any_admin');
    if (error) {
      logger.error('Error checking for admin', error as Error);
      return false;
    }
    return data;
  };

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'guide') => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    // If user already exists, they might have been invited
    if (error && error.message.includes('already registered')) {
      throw new Error('This email has already been invited to the system. Please check your email for an invitation link or contact an administrator.');
    }

    if (error) throw error;

    if (data.user) {
      const adminExists = await hasAnyAdmin();
      const actualRole = adminExists ? 'guide' : 'admin';

      // First user (admin) is auto-approved, all others are pending
      const status = adminExists ? 'pending' : 'active';
      const approvedAt = adminExists ? null : new Date().toISOString();

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          name,
          role: actualRole,
          status: status,
          approved_at: approvedAt
        });

      if (profileError) throw profileError;

      // If user is pending, immediately sign them out with a message
      if (status === 'pending') {
        await supabase.auth.signOut();
        throw new Error('Registration successful! Your account is pending admin approval. You will be notified once approved.');
      }
    }
  };

  const signOut = async () => {
    try {
      setUserProfile(null);
      setUser(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear any stored session data
      localStorage.removeItem('desert-paths-auth');
    } catch (error) {
      // Even if sign out fails, clear local state
      setUserProfile(null);
      setUser(null);
      localStorage.removeItem('desert-paths-auth');
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!userProfile?.email) {
      throw new Error('No user logged in');
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signUp, signOut, hasAnyAdmin, changePassword, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
