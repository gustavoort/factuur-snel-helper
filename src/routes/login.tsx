import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { GuestRoute } from "@/components/ProtectedRoute";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inloggen — FactuurSnel" },
      { name: "description", content: "Log in op FactuurSnel om je offertes en facturen te beheren." },
      { property: "og:title", content: "Inloggen — FactuurSnel" },
      { property: "og:description", content: "Log in op FactuurSnel om je offertes en facturen te beheren." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <GuestRoute>
      <LoginPage />
    </GuestRoute>
  ),
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      void navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Inloggen mislukt. Controleer je gegevens.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welkom terug" subtitle="Log in op je FactuurSnel-account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Bezig…" : "Inloggen"}
        </Button>
      </form>
      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <Link to="/forgot-password" className="text-primary hover:underline">
          Wachtwoord vergeten?
        </Link>
        <p>
          Nog geen account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Registreren
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
