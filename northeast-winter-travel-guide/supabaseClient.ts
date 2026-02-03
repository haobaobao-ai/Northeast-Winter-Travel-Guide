import { createClient } from '@supabase/supabase-js';

// 默认值 (如果本地没有配置，则使用这些)
const DEFAULT_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxb2NvbmNhYXVsZ3lmZHZxcXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzYwNTksImV4cCI6MjA4NTI1MjA1OX0.O0VAkD4JgEBgDXnNW2ooImNNzCBnlscV6-ElTfd-UYs';

// 优先从 localStorage 读取配置 (允许用户在 UI 中修改)
const savedUrl = localStorage.getItem('custom_supabase_url');
const savedKey = localStorage.getItem('custom_supabase_key');

const SUPABASE_URL = savedUrl || DEFAULT_URL;
const SUPABASE_ANON_KEY = savedKey || DEFAULT_KEY;

// 简单的格式检查
if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    console.warn('⚠️ Supabase Key 格式可能不正确 (通常以 eyJ 开头)。请检查是否使用了正确的 Anon Key。');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 辅助函数：保存新配置并重载
export const updateSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('custom_supabase_url', url.trim());
    localStorage.setItem('custom_supabase_key', key.trim());
    window.location.reload(); // 强制刷新以应用新客户端
};

export const resetSupabaseConfig = () => {
    localStorage.removeItem('custom_supabase_url');
    localStorage.removeItem('custom_supabase_key');
    window.location.reload();
};

export const getCurrentConfig = () => ({
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    isCustom: !!savedKey
});