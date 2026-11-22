import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { safeRedirectPath } from "@/lib/redirect";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/** Redirects unauthenticated users to /login, remembering where they were going. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = safeRedirectPath(`${location.pathname}${location.searchStr}`);
  // The location changes to /login while this guard is still mounted; redirect once
  // so the second run does not replace the login URL and drop the redirect target.
  const redirected = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      redirected.current = false;
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    void navigate({
      to: "/login",
      search: target && target !== "/dashboard" ? { redirect: target } : {},
      replace: true,
    });
  }, [isAuthenticated, isLoading, navigate, target]);

  if (isLoading || !isAuthenticated) return <FullScreenLoader />;
  return <>{children}</>;
}

/** Redirects authenticated users away from /login and /register. */
export function GuestRoute({
  children,
  redirectTo,
}: {
  children: ReactNode;
  redirectTo?: string | undefined;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const target = safeRedirectPath(redirectTo);
      if (target) router.history.replace(target);
      else void navigate({ to: "/dashboard", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, router, redirectTo]);

  if (isLoading || isAuthenticated) return <FullScreenLoader />;
  return <>{children}</>;
}
