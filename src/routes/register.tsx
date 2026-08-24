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

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({ meta: pageMeta("auth.register.title", "auth.register.subtitle") }),
  component: () => (
    <GuestRoute>
      <RegisterPage />
    </GuestRoute>
  ),
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ name, email, password });
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("auth.register.failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.name")}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("common.busy") : t("auth.register.submit")}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="text-primary hover:underline">
          {t("auth.register.loginLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
