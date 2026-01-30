import { createClient } from '@supabase/supabase-js';

// ⚠️ 极其重要：
// 1. 下面的 SUPABASE_URL 应该是你的项目 URL (如 https://xyz.supabase.co)
// 2. 下面的 SUPABASE_ANON_KEY 必须是你从 Supabase 后台 -> Project Settings -> API 复制的 "anon public" Key。
//    它应该是一串非常长的、以 "eyJ" 开头的字符。
//    现在的 'sb_publishable...' 是错误的 Key，请务必替换，否则数据无法同步。

const SUPABASE_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable__mEJwAPbyyH5sKWKV88cew_ADH7vlNp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const PLAN_ID = 1;