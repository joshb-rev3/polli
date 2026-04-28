import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

interface Session {
  userId: string | null;
  name: string | null;
  eligible: boolean;
  loading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInDemo: (name: string) => void; // fallback when Supabase not configured
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session>({
  userId: null,
  name: null,
  eligible: false,
  loading: true,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signInWithFacebook: async () => {},
  signInDemo: () => {},
  signOut: async () => {},
});

const redirectTo = AuthSession.makeRedirectUri({ scheme: "polli" });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setUserId(data.session.user.id);
        setName(
          (data.session.user.user_metadata?.name as string) ||
            data.session.user.email ||
            null
        );
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (session) {
        setUserId(session.user.id);
        setName(
          (session.user.user_metadata?.name as string) ||
            session.user.email ||
            null
        );
      } else {
        setUserId(null);
        setName(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithApple = async () => {
    if (!supabaseConfigured || Platform.OS !== "ios") {
      return signInDemo("Apple User");
    }
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (cred.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: cred.identityToken,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      console.warn("Apple sign-in failed:", e?.message);
    }
  };

  const signInWithOAuth = async (provider: "google" | "facebook") => {
    if (!supabaseConfigured) {
      return signInDemo(`${provider} User`);
    }
    const { data } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (!data?.url) return;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return;
    const url = new URL(result.url);
    const access = url.searchParams.get("access_token") || new URLSearchParams(url.hash.slice(1)).get("access_token");
    const refresh = url.searchParams.get("refresh_token") || new URLSearchParams(url.hash.slice(1)).get("refresh_token");
    if (access && refresh) {
      await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    }
  };

  const signInDemo = (n: string) => {
    setUserId("local-demo");
    setName(n);
  };

  const signOut = async () => {
    if (supabaseConfigured) await supabase.auth.signOut();
    setUserId(null);
    setName(null);
  };

  return (
    <SessionContext.Provider
      value={{
        userId,
        name,
        eligible: Boolean(userId),
        loading,
        signInWithApple,
        signInWithGoogle: () => signInWithOAuth("google"),
        signInWithFacebook: () => signInWithOAuth("facebook"),
        signInDemo,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
