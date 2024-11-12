import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Exporting the createClient function
export const createClient = () => supabaseCreateClient(supabaseUrl, supabaseAnonKey);

// Exporting the supabase instance
export const supabase = createClient();