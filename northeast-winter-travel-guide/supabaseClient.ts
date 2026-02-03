import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb2NvbmNhYXVsZ3lmZHZxcXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzYwNTksImV4cCI6MjA4NTI1MjA1OX0.O0VAkD4JgEBgDXnNW2ooImNNzCBnlscV6-ElTfd-UYs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);