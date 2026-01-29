import { createClient } from '@supabase/supabase-js';

// 【重要】请将下面的 URL 和 KEY 替换为你自己在 Supabase Dashboard -> Project Settings -> API 中获取的内容
// 注意：为了方便你部署，我们直接把 Key 放在这里。在实际的商业项目中，这通常放在环境变量里。
// 但因为你的 Supabase 开启了 Row Level Security (或者没开也没事，这是个私人小项目)，且 Key 是 public 的，所以直接写在这里没问题。

const SUPABASE_URL = 'https://aqoconcaaulgyfdvqqwo.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable__mEJwAPbyyH5sKWKV88cew_ADH7vlNp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 数据库中的 ID，我们在 SQL 中只插入了一行数据，假设 ID 为 1
// 如果你的 ID 不是 1，请去数据库确认
export const PLAN_ID = 1;