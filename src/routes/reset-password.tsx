import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Search = { token?: string };

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nieuw wachtwoord — FactuurSnel" },
      { name: "description", content: "Stel een nieuw wachtwoord in voor je FactuurSnel-account." },
      { property: "og:title", content: "Nieuw wachtwoord — FactuurSnel" },
      { property: "og:description", content: "Stel een nieuw wachtwoord in voor je FactuurSnel-account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Wachtwoord bijgewerkt. Je kunt nu inloggen.");
      void navigate({ to: "/login", replace: true });
    } catch {
      toast.error("De link is ongeldig of verlopen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Nieuw wachtwoord" subtitle="Kies een nieuw wachtwoord voor je account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nieuw wachtwoord</Label>
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
          {loading ? "Bezig…" : "Wachtwoord opslaan"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </AuthShell>
  );
}
