import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeleteUsersRequest {
  userIds: string[];
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

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      throw new Error('Insufficient permissions - admin only');
    }

    // Parse request body
    const { userIds }: DeleteUsersRequest = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('Invalid user IDs');
    }

    // Delete users
    const deletedUsers: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
          userId,
          true
        );
        if (deleteError) {
          errors.push({ userId, error: deleteError.message });
        } else {
          deletedUsers.push(userId);
        }
      } catch (err: any) {
        errors.push({ userId, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedUsers,
        errors,
        deletedCount: deletedUsers.length,
        errorCount: errors.length
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