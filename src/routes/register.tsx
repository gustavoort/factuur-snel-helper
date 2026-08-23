import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { GuestRoute } from "@/components/ProtectedRoute";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account aanmaken — FactuurSnel" },
      { name: "description", content: "Maak gratis een FactuurSnel-account aan en stuur je eerste factuur." },
      { property: "og:title", content: "Account aanmaken — FactuurSnel" },
      { property: "og:description", content: "Maak gratis een FactuurSnel-account aan en stuur je eerste factuur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <GuestRoute>
      <RegisterPage />
    </GuestRoute>
  ),
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
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
      toast.error(getApiErrorMessage(err, "Registreren mislukt. Probeer het opnieuw."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Account aanmaken" subtitle="Start gratis met FactuurSnel.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Naam</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Bezig…" : "Registreren"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Heb je al een account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Inloggen
        </Link>
      </p>
    </AuthShell>
  );
}
