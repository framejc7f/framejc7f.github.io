import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://pcvqodcxsxhisbzgibxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DsfC0XAz-UfEENRbXc7WRg_RXtKSWpl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
