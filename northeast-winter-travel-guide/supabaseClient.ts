import { createClient } from '@supabase/supabase-js';

// ⚠️ 极其重要：
// 1. 下面的 SUPABASE_URL 应该是你的项目 URL
// 2. 下面的 SUPABASE_ANON_KEY 必须是你从 Supabase 后台 -> Project Settings -> API 复制的 "anon public" Key。

const SUPABASE_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable__mEJwAPbyyH5sKWKV88cew_ADH7vlNp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 移除 PLAN_ID 常量
// 我们现在改为动态从数据库获取最新的 ID，避免因为强制指定 ID 而导致的权限错误。