# Email Authentication Setup Guide

This guide explains how to configure email invitations and password reset functionality.

## Problem Overview

Email invitation links and password reset links were not working properly due to missing Supabase redirect URL configuration. When users clicked these links, they either saw errors or were redirected to the wrong location.

## Root Cause

Supabase requires all redirect URLs to be explicitly whitelisted in the project's Authentication settings. Without this configuration, Supabase blocks or defaults to the Site URL instead of your intended redirect URL.

---

## Required Configuration Steps

### 1. Configure Supabase Dashboard Settings

**CRITICAL:** You MUST complete these steps for email authentication to work.

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/ymoieilxtfyqybpbpvic
   - Or: https://supabase.com/dashboard → Select your project

2. **Go to Authentication → URL Configuration**

3. **Set the Site URL**
   - For development: `http://localhost:5173`
   - For production: `https://yourdomain.com`

4. **Add Redirect URLs** (Click "Add URL" for each)
   - `http://localhost:5173/**` (Wildcard for local development)
   - `http://localhost:5173/reset-password` (Explicit reset URL)
   - `https://yourdomain.com/**` (Production wildcard)
   - `https://yourdomain.com/reset-password` (Production reset URL)

5. **Save Configuration**

### 2. Configure Production Environment (When Deploying)

When deploying to production, you need to set the APP_URL secret for your edge functions:

1. Go to Supabase Dashboard → Edge Functions
2. Click on Settings/Secrets
3. Add a new secret:
   - Name: `APP_URL`
   - Value: `https://yourdomain.com` (your production URL)

This ensures invitation emails use your production URL instead of localhost.

---

## How It Works

### Password Reset Flow

1. User clicks "Forgot password" on login page
2. Enters email address
3. System sends email via `supabase.auth.resetPasswordForEmail()`
4. Email contains link to: `http://localhost:5173/reset-password#access_token=...&type=recovery`
5. User clicks link → App detects tokens in URL hash
6. User enters new password → Password updated
7. User redirected to login with new credentials

### Invitation Flow

1. Admin creates new user with "Send Invitation" enabled
2. System calls `inviteUserByEmail()` edge function
3. Edge function determines correct APP_URL (from env or request headers)
4. Invitation email sent with link to: `http://localhost:5173/reset-password#access_token=...&type=invite`
5. User clicks link → App detects invitation type
6. User enters name and creates password
7. Edge function creates user profile
8. User can log in with credentials

---

## Debugging

### Check Console Logs

The Auth component now includes detailed console logging:

```javascript
console.log('Password reset check:', {...});
console.log('Starting password reset/invitation flow', ...);
console.log('Current session:', {...});
```

Open browser DevTools (F12) → Console tab to see these logs.

### Common Issues & Solutions

**Issue: "Invalid or expired reset link"**
- **Cause:** URL not whitelisted in Supabase Dashboard
- **Solution:** Add the redirect URL to Authentication → URL Configuration

**Issue: "No active session found"**
- **Cause:** User clicked expired link or tokens not in URL
- **Solution:** Request a new invitation/reset link

**Issue: Email not sent**
- **Cause:** SMTP not configured or email provider blocked
- **Solution:** Check Supabase Dashboard → Authentication → Email Templates
- Verify Custom SMTP settings if configured

**Issue: Redirects to localhost in production**
- **Cause:** APP_URL not set in edge function secrets
- **Solution:** Set APP_URL secret in Supabase Dashboard → Edge Functions

---

## Testing Checklist

### Test Password Reset

- [ ] Navigate to login page
- [ ] Click "Forgot password"
- [ ] Enter email and submit
- [ ] Check console for: "Requesting password reset with redirect: ..."
- [ ] Check email inbox for reset link
- [ ] Click link in email
- [ ] Verify redirect to `/reset-password` with tokens in URL hash
- [ ] Check console for: "Valid password reset/invite link detected"
- [ ] Enter new password and confirm
- [ ] Check console for: "Password updated successfully"
- [ ] Verify redirect to login
- [ ] Log in with new password

### Test User Invitation

- [ ] As admin, go to Staff Directory
- [ ] Click "Add Staff Member"
- [ ] Fill in details and enable "Send Invitation Email"
- [ ] Submit form
- [ ] Check browser console for edge function response
- [ ] Check email inbox for invitation link
- [ ] Click link in email
- [ ] Verify redirect to `/reset-password` with tokens
- [ ] Check console for: "Valid password reset/invite link detected"
- [ ] Verify "Set up your account" message appears
- [ ] Enter name and create password
- [ ] Check console for: "Profile creation result: ..."
- [ ] Verify redirect to login
- [ ] Log in with credentials
- [ ] Verify user profile exists and is active

---

## Code Changes Made

### 1. Edge Function (`supabase/functions/create-user/index.ts`)
- Added proper URL determination with fallback chain
- Uses `APP_URL` environment variable for production
- Falls back to request headers, then localhost
- Added console logging for debugging

### 2. Auth Component (`src/components/Auth.tsx`)
- Added error detection from URL parameters
- Enhanced console logging throughout auth flow
- Added session validation logging
- Better error messages for users
- Detects and handles invalid/expired links

### 3. Environment Configuration (`.env`)
- Added documentation for APP_URL usage in edge functions
- Clarified production vs development configuration

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Update Supabase Dashboard Site URL to production domain
- [ ] Add production domain to Redirect URLs list
- [ ] Set APP_URL secret in Supabase Edge Functions
- [ ] Test password reset in production
- [ ] Test user invitation in production
- [ ] Verify email delivery in production
- [ ] Check browser console for any errors

---

## Support

If you encounter issues:

1. Check browser console (F12 → Console tab)
2. Verify Supabase Dashboard configuration
3. Test with a fresh browser session (incognito mode)
4. Check Supabase logs: Dashboard → Logs → Auth Logs
5. Verify email delivery: Check spam/junk folders

---

## References

- [Supabase Redirect URLs Documentation](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Password Reset](https://supabase.com/docs/guides/auth/passwords)
