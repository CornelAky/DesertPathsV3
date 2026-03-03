import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Key, LogOut, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccountSettings from './AccountSettings';
import PasswordChange from './PasswordChange';

interface UserMenuProps {
  variant?: 'admin' | 'client' | 'guide';
}

export default function UserMenu({ variant = 'admin' }: UserMenuProps) {
  const { userProfile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    setIsOpen(false);

    try {
      await signOut();
    } catch (error: any) {
      console.error('Error signing out:', error);
      setSignOutError(error?.message || 'Failed to sign out. Please try again.');
      setSigningOut(false);
    }
  };

  const openSettings = () => {
    setShowAccountSettings(true);
    setIsOpen(false);
  };

  const openPasswordChange = () => {
    setShowPasswordChange(true);
    setIsOpen(false);
  };

  const displayName = userProfile?.name || userProfile?.email || 'User';
  const displayRole = userProfile?.role || 'user';

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg transition-all
            ${variant === 'admin'
              ? 'text-brand-brown-warm hover:text-white hover:bg-brand-terracotta border border-transparent hover:border-brand-terracotta'
              : 'text-brand-chocolate hover:bg-brand-beige-light'
            }
            ${signingOut ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          disabled={signingOut}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-terracotta text-white flex items-center justify-center font-semibold text-sm overflow-hidden">
              {userProfile?.profile_image_url ? (
                <img
                  src={userProfile.profile_image_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-semibold leading-tight">{displayName}</p>
              <p className="text-xs capitalize opacity-75">{displayRole}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-200 lg:hidden">
              <p className="text-sm font-semibold text-brand-charcoal">{displayName}</p>
              <p className="text-xs text-brand-brown-light capitalize">{displayRole}</p>
            </div>

            <button
              onClick={openSettings}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>

            <button
              onClick={openPasswordChange}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition-colors"
            >
              <Key className="w-4 h-4" />
              <span>Change Password</span>
            </button>

            <div className="border-t border-gray-200 mt-1 pt-1">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signingOut ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {signOutError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <p className="font-semibold text-sm mb-1">Sign Out Error</p>
          <p className="text-sm">{signOutError}</p>
          <button
            onClick={() => setSignOutError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <AccountSettings
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />

      <PasswordChange
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
      />
    </>
  );
}
