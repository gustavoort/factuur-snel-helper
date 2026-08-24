import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  FileText,
  ReceiptText,
  Building2,
  CreditCard,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";

const mainNav = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/clients", labelKey: "nav.clients", icon: Users },
  { to: "/quotes", labelKey: "nav.quotes", icon: FileText },
  { to: "/invoices", labelKey: "nav.invoices", icon: ReceiptText },
] as const;

const secondaryNav = [
  { to: "/company", labelKey: "nav.company", icon: Building2 },
  { to: "/billing", labelKey: "nav.billing", icon: CreditCard },
] as const;

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();

  const item = (to: string, labelKey: string, Icon: typeof Users) => {
    const active = pathname === to || pathname.startsWith(`${to}/`);
    return (
      <Link
        key={to}
        to={to}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
        {t(labelKey)}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      {mainNav.map((n) => item(n.to, n.labelKey, n.icon))}
      <div className="my-3 h-px bg-sidebar-border" />
      {secondaryNav.map((n) => item(n.to, n.labelKey, n.icon))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/dashboard" onClick={onNavigate} className="px-1">
        <Logo />
      </Link>
      <div className="flex-1 overflow-y-auto">
        <NavList onNavigate={onNavigate} />
      </div>
      <div className="space-y-4 border-t border-sidebar-border pt-4">
        <LanguageSelector />
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name ?? t("nav.user")}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label={t("nav.logout")} onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("nav.menu")}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Logo />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}

export { X };
