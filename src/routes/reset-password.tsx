import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageMeta } from "@/i18n/head";

type Search = { token?: string | undefined };

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : undefined,
  }),
  head: () => ({ meta: pageMeta("auth.reset.title", "auth.reset.subtitle") }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success(t("auth.reset.success"));
      void navigate({ to: "/login", replace: true });
    } catch {
      toast.error(t("auth.reset.invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.reset.newPassword")}</Label>
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
          {loading ? t("common.busy") : t("auth.reset.submit")}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          {t("auth.forgot.back")}
        </Link>
      </p>
    </AuthShell>
  );
}
