import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password?: string;
  name: string;
  role: string;
  phone_number?: string | null;
  job_title?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  tour_license_url?: string | null;
  tour_license_expiry?: string | null;
  master_staff_id?: string | null;
  send_invitation?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'manager')) {
      throw new Error('Insufficient permissions');
    }

    // Parse request body
    const userData: CreateUserRequest = await req.json();

    // Determine if we should send invitation email
    const sendInvitation = userData.send_invitation ?? false;

    // Create auth user using admin API
    const authUserOptions: any = {
      email: userData.email,
      email_confirm: !sendInvitation, // Only auto-confirm if not sending invitation
      user_metadata: {
        name: userData.name
      }
    };

    // If sending invitation, don't set password (user will set it via invitation link)
    // If not sending invitation, require a password
    if (sendInvitation) {
      // Generate a temporary random password that the user won't use
      authUserOptions.password = crypto.randomUUID();
    } else {
      if (!userData.password) {
        throw new Error('Password is required when not sending invitation');
      }
      authUserOptions.password = userData.password;
    }

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser(authUserOptions);

    if (createAuthError) {
      throw createAuthError;
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    // Only create user profile if NOT sending invitation
    // When sending invitation, user will complete their profile after accepting
    if (!sendInvitation) {
      const { error: profileInsertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: 'active',
          phone_number: userData.phone_number || null,
          job_title: userData.job_title || null,
          bio: userData.bio || null,
          profile_picture_url: userData.profile_picture_url || null,
          tour_license_url: userData.tour_license_url || null,
          tour_license_expiry: userData.tour_license_expiry || null,
        });

      if (profileInsertError) {
        // If profile creation fails, delete the auth user to maintain consistency
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id, true);
        throw profileInsertError;
      }

      // If master_staff_id is provided, link the user to the staff member
      if (userData.master_staff_id) {
        const { error: staffUpdateError } = await supabaseAdmin
          .from('master_staff')
          .update({ user_id: authData.user.id })
          .eq('id', userData.master_staff_id);

        if (staffUpdateError) {
          console.error('Failed to link user to master_staff:', staffUpdateError);
        }
      }
    } else {
      // Store the intended role and master_staff_id in user metadata for later
      await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          name: userData.name,
          intended_role: userData.role,
          master_staff_id: userData.master_staff_id || null
        }
      });
    }

    // Send invitation email if requested
    if (sendInvitation) {
      // Determine the app URL with proper fallback chain
      let appUrl = Deno.env.get('APP_URL'); // Production URL from env

      if (!appUrl) {
        // Fall back to request origin
        const origin = req.headers.get('origin') || req.headers.get('referer');
        if (origin) {
          appUrl = origin.replace(/\/$/, '');
        }
      }

      // Final fallback for local development
      if (!appUrl) {
        appUrl = 'http://localhost:5173';
      }

      const redirectUrl = `${appUrl}/reset-password`;
      console.log('Sending invitation with redirect URL:', redirectUrl);

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        userData.email,
        {
          redirectTo: redirectUrl
        }
      );

      if (inviteError) {
        console.error('Failed to send invitation email:', inviteError);
        console.error('Redirect URL used:', redirectUrl);
        // Don't fail the whole request if invitation fails
      } else {
        console.log('Invitation email sent successfully to:', userData.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});