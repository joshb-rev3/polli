import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useSession } from "./session";

/**
 * Redirects to /auth when there is no signed-in user.
 * Returns ready=true only after session is loaded and a user exists.
 */
export function useRequireAuth(
  next: string,
  opts?: { id?: string },
): { ready: boolean; loading: boolean } {
  const { userId, loading, signingOut } = useSession();
  const router = useRouter();
  const id = opts?.id;

  useEffect(() => {
    if (loading || signingOut) return;
    if (userId) return;
    router.replace({
      pathname: "/auth",
      params: {
        next,
        ...(id ? { id } : {}),
      },
    });
  }, [loading, signingOut, userId, next, id, router]);

  return { ready: !loading && Boolean(userId), loading };
}
