import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CompleteProfileRequest {
  name: string;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile already exists'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }

    // Parse request body
    const { name }: CompleteProfileRequest = await req.json();

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    // Get the intended role and master_staff_id from user metadata
    const intendedRole = user.user_metadata?.intended_role || 'guide';
    const masterStaffId = user.user_metadata?.master_staff_id;

    // Create user profile
    const { error: profileInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        name: name.trim(),
        role: intendedRole,
        status: 'active',
      });

    if (profileInsertError) {
      throw profileInsertError;
    }

    // If master_staff_id was provided during invitation, link the user
    if (masterStaffId) {
      const { error: staffUpdateError } = await supabaseAdmin
        .from('master_staff')
        .update({ user_id: user.id })
        .eq('id', masterStaffId);

      if (staffUpdateError) {
        console.error('Failed to link user to master_staff:', staffUpdateError);
      }
    }

    // Clean up metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        name: name.trim()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile created successfully'
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