import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/api";
import { GuestRoute } from "@/components/ProtectedRoute";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageMeta } from "@/i18n/head";
import { isPaymentReturn, safeRedirectPath } from "@/lib/redirect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Clock } from "lucide-react";

type LoginSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeRedirectPath(search["redirect"]),
  }),
  head: () => ({ meta: pageMeta("auth.login.title", "auth.login.subtitle") }),
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return (
    <GuestRoute redirectTo={redirect}>
      <LoginPage redirect={redirect} />
    </GuestRoute>
  );
}

function LoginPage({ redirect }: { redirect: string | undefined }) {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      if (redirect) router.history.replace(redirect);
      else void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("auth.login.failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      {sessionExpired && !isPaymentReturn(redirect) && (
        <Alert className="mb-4 border-amber-600/30 bg-amber-600/5">
          <Clock className="h-4 w-4 text-amber-700" />
          <AlertDescription>{t("errors.sessionExpired")}</AlertDescription>
        </Alert>
      )}
      {isPaymentReturn(redirect) && (
        <Alert className="mb-4 border-primary/30 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription>{t("auth.login.paymentReturn")}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.busy") : t("auth.login.submit")}
        </Button>
      </form>
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <Link to="/forgot-password" className="text-primary hover:underline">
          {t("auth.login.forgot")}
        </Link>
        <p>
          {t("auth.login.noAccount")}{" "}
          <Link to="/register" className="text-primary hover:underline">
            {t("auth.login.registerLink")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
