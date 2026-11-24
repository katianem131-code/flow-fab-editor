import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_PATHS = ["/auth", "/reset-password", "/privacidade", "/termos", "/exclusao-de-dados"];
export const AFTER_LOGIN_KEY = "labremix:after-login";

export function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (isPublic || loading || user) return;
    try { sessionStorage.setItem(AFTER_LOGIN_KEY, href); } catch { /* ignore */ }
    navigate({ to: "/auth", replace: true });
  }, [isPublic, loading, user, href, navigate]);

  if (isPublic || user) return <>{children}</>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-9 w-9 animate-pulse place-items-center rounded-md bg-primary text-primary-foreground">
          <Scissors className="h-4 w-4" />
        </span>
        <span className="text-sm">Verificando acesso...</span>
      </div>
    </div>
  );
}
