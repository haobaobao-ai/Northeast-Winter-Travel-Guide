import { createClient } from '@supabase/supabase-js';

// ⚠️ 极其重要：
// 1. 下面的 SUPABASE_URL 应该是你的项目 URL (如 https://xyz.supabase.co)
// 2. 下面的 SUPABASE_ANON_KEY 必须是你从 Supabase 后台 -> Project Settings -> API 复制的 "anon public" Key。
//    它应该是一串非常长的、以 "eyJ" 开头的字符。

const SUPABASE_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable__mEJwAPbyyH5sKWKV88cew_ADH7vlNp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 回退到 1，因为这一行数据在数据库里已经存在，可以被“更新(Update)”。
// 如果用新的 ID (如 3)，数据库可能会因为权限设置拒绝“创建(Insert)”新行。
export const PLAN_ID = 1;