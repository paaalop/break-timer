import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !key) {
  console.warn('[Supabase] 환경변수 없음 — 목업 모드로 동작합니다.');
}

export const supabase = (url && key) ? createClient(url, key) : null;
