import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wachtwoord vergeten — FactuurSnel" },
      { name: "description", content: "Ontvang een link om je FactuurSnel-wachtwoord opnieuw in te stellen." },
      { property: "og:title", content: "Wachtwoord vergeten — FactuurSnel" },
      { property: "og:description", content: "Ontvang een link om je FactuurSnel-wachtwoord opnieuw in te stellen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      toast.error("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Wachtwoord vergeten" subtitle="We sturen je een herstellink per e-mail.">
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Als dit e-mailadres bestaat, ontvang je zo een e-mail met instructies.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bezig…" : "Herstellink sturen"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </AuthShell>
  );
}
