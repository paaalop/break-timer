import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthSession {
  user: { id: string; email: string | undefined };
  access_token: string;
}

interface AuthStore {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isLoading: true,

  signIn: async (usernameOrEmail: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    }

    const trimmed = usernameOrEmail.trim();
    const email = trimmed.includes('@') ? trimmed : `${trimmed}@test.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    // proxy.ts 라우트 보호용 쿠키 설정
    if (typeof document !== 'undefined') {
      document.cookie = 'auth-token=1; path=/; max-age=86400; SameSite=Lax';
    }

    set({
      session: data.session
        ? {
            user: { id: data.session.user.id, email: data.session.user.email },
            access_token: data.session.access_token,
          }
        : null,
      isLoading: false,
    });
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'auth-token=; path=/; max-age=0';
    }
    set({ session: null });
  },

  checkSession: async () => {
    if (!supabase) {
      set({ session: null, isLoading: false });
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=1; path=/; max-age=86400; SameSite=Lax';
        }
        set({
          session: {
            user: { id: data.session.user.id, email: data.session.user.email },
            access_token: data.session.access_token,
          },
          isLoading: false,
        });
      } else {
        set({ session: null, isLoading: false });
      }
    } catch {
      set({ session: null, isLoading: false });
    }
  },
}));
