import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface StaffRole {
  role_value: string;
  role_label: string;
}

export interface RoleDisplay {
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  icon: string;
}

/**
 * Hook to fetch and sync staff roles from the database in real-time
 */
export function useStaffRoles() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_staff_roles');

      if (fetchError) throw fetchError;

      setRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching staff roles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return { roles, loading, error, refetch: fetchRoles };
}

/**
 * Get display information for a staff role
 */
export function getRoleDisplay(role: string, customRole: string | null = null): RoleDisplay {
  // If custom role, return default styling
  if (customRole) {
    return {
      label: customRole,
      color: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
      icon: 'Users'
    };
  }

  // Map roles to display info
  const roleMap: Record<string, RoleDisplay> = {
    guide: {
      label: 'Guide',
      color: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      icon: 'Users'
    },
    driver: {
      label: 'Driver',
      color: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      icon: 'Truck'
    },
    coordinator: {
      label: 'Coordinator',
      color: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      icon: 'UserPlus'
    },
    photographer: {
      label: 'Photographer',
      color: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
      icon: 'Camera'
    },
    translator: {
      label: 'Translator',
      color: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
      icon: 'FileText'
    },
    heritage_specialist: {
      label: 'Heritage Specialist',
      color: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
      icon: 'MapPin'
    },
    biblical_consultant: {
      label: 'Biblical Consultant',
      color: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
      icon: 'BookOpen'
    },
    chef: {
      label: 'Chef',
      color: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      icon: 'Utensils'
    },
    medic: {
      label: 'Medic',
      color: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      icon: 'Activity'
    },
    security: {
      label: 'Security',
      color: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
      icon: 'Shield'
    },
    porter: {
      label: 'Porter',
      color: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
      icon: 'Backpack'
    },
    assistant: {
      label: 'Assistant',
      color: { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' },
      icon: 'UserCheck'
    },
    other: {
      label: 'Other',
      color: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
      icon: 'Users'
    }
  };

  return roleMap[role] || roleMap.other;
}

/**
 * Format role label from role value
 */
export function formatRoleLabel(role: string, customRole: string | null = null): string {
  if (customRole) return customRole;

  const display = getRoleDisplay(role);
  return display.label;
}
