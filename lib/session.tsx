import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type AuthProvider = "apple" | "google" | "facebook" | null;

interface Session {
  userId: string | null;
  name: string | null;
  authProvider: AuthProvider;
  eligible: boolean;
  loading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  /** Demo/local sign-in. Pass provider so Apple can unlock the payout simulation. */
  signInDemo: (name: string, provider?: AuthProvider) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session>({
  userId: null,
  name: null,
  authProvider: null,
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
  const [authProvider, setAuthProvider] = useState<AuthProvider>(null);
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
      return signInDemo("Apple User", "apple");
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
        setAuthProvider("apple");
      }
    } catch (e: any) {
      console.warn("Apple sign-in failed:", e?.message);
    }
  };

  const signInWithOAuth = async (provider: "google" | "facebook") => {
    if (!supabaseConfigured) {
      return signInDemo(`${provider} User`, provider);
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("No OAuth URL returned from Supabase");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !("url" in result) || !result.url) {
      throw new Error("Sign-in was cancelled");
    }

    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      setAuthProvider(provider);
      return;
    }

    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const access = url.searchParams.get("access_token") || hash.get("access_token");
    const refresh = url.searchParams.get("refresh_token") || hash.get("refresh_token");
    if (access && refresh) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (sessionError) throw sessionError;
      setAuthProvider(provider);
      return;
    }

    throw new Error("Sign-in completed but no session tokens were returned. Check redirect URLs in Supabase Auth settings.");
  };

  const signInDemo = (n: string, provider: AuthProvider = null) => {
    setUserId(provider === "apple" ? "local-demo-apple" : "local-demo");
    setName(n);
    setAuthProvider(provider);
  };

  const signOut = async () => {
    if (supabaseConfigured) await supabase.auth.signOut();
    setUserId(null);
    setName(null);
    setAuthProvider(null);
  };

  return (
    <SessionContext.Provider
      value={{
        userId,
        name,
        authProvider,
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
