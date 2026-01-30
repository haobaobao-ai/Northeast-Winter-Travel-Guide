import { createClient } from '@supabase/supabase-js';

// ⚠️ 注意：请去 Supabase 后台 -> Project Settings -> API
// 复制 "anon public" 下面那串以 eyJ 开头的长字符。
// 现在的 'sb_publishable...' 格式通常是不对的，会导致数据无法加载。
const SUPABASE_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable__mEJwAPbyyH5sKWKV88cew_ADH7vlNp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const PLAN_ID = 1;