import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: pageMeta("auth.login.title", "auth.login.subtitle") }),
  component: () => (
    <GuestRoute>
      <LoginPage />
    </GuestRoute>
  ),
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("auth.login.failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
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
