"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import {
  Home,
  Users,
  Calendar,
  Briefcase,
  FolderKanban,
  Network,
  Shield,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Globe,
  X,
  User,
  TrendingUp,
  Eye,
  ExternalLink,
} from "lucide-react";

const EXTERNAL_APPS = [
  {
    href: "https://b4p-quantitative.vercel.app/",
    label: "Supply Request System",
    icon: TrendingUp,
  },
  {
    href: "https://b4p-external-view-w26.vercel.app/",
    label: "External Dashboard",
    icon: Eye,
  },
];

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/dashboard", label: "Members", icon: Users },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/careers", label: "Careers", icon: Briefcase },
  { href: "/teams", label: "Teams", icon: FolderKanban },
  { href: "/connections", label: "Connections", icon: Network },
];

const ROUTE_META = [
  {
    href: "/home",
    title: "Network Home",
    subtitle: "Updates, events, and asks across the Blueprints community.",
  },
  {
    href: "/dashboard",
    title: "Member Directory",
    subtitle: "Search alumni, majors, roles, and shared context quickly.",
  },
  {
    href: "/events",
    title: "Events",
    subtitle: "Track the moments bringing the network together.",
  },
  {
    href: "/careers",
    title: "Careers",
    subtitle: "Keep opportunities visible to the community.",
  },
  {
    href: "/teams",
    title: "Teams",
    subtitle: "Follow who is doing what across Blueprints.",
  },
  {
    href: "/connections",
    title: "Connections",
    subtitle: "Map the relationships that keep the alumni network warm.",
  },
  {
    href: "/admin",
    title: "Admin",
    subtitle: "Manage the data that powers the alumni atlas.",
  },
];

export default function AppShell({
  children,
  isAdmin,
  profileHref,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  profileHref: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const routeMeta = ROUTE_META.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  ) ?? {
    title: "Blueprints for Pangaea",
    subtitle: "A shared home for alumni profiles, opportunities, and updates.",
  };

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh bg-transparent">
      {/* ── Mobile Backdrop ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "glass fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-sidebar-border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:z-auto",
          // Desktop width
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          // Mobile: translate off-screen
          mobileOpen
            ? "w-64 translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "relative z-10 shrink-0 border-b border-sidebar-border transition-all",
            collapsed
              ? "flex h-16 items-center justify-center px-3"
              : "px-5 py-5",
          )}
        >
          {collapsed ? (
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Globe className="size-4" />
            </div>
          ) : (
            <>
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              >
                <X className="size-4" />
              </button>
              <div className="flex items-center justify-center p-4">
                {/* Two marks, one per theme: the colour logo's ink is navy and
                    its globe grid lines are knockouts, so it needs a light
                    background; the white mark is a knockout built for dark. */}
                <Image
                  src="/brand/blueprints-logo.png"
                  alt="Blueprints for Pangaea"
                  width={936}
                  height={556}
                  priority
                  className="h-auto w-[11rem] dark:hidden"
                />
                <Image
                  src="/brand/blueprints-logo-white.png"
                  alt=""
                  aria-hidden
                  width={936}
                  height={556}
                  priority
                  className="hidden h-auto w-[11rem] dark:block"
                />
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-[11px] font-medium tracking-[0.02em] text-foreground">
                  Blueprints Hub
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground/90">
                  Members, opportunities, updates, and org needs.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p
            className={cn(
              "mb-2 px-4 text-[11px] font-medium text-muted-foreground transition-opacity",
              collapsed && "lg:opacity-0",
            )}
          >
            Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium transition-all duration-150",
                  active
                    ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.58_0.06_255/0.14)] dark:shadow-[inset_0_0_0_1px_oklch(0.72_0.1_255/0.28)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "lg:justify-center lg:px-0",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span
                  className={cn("transition-opacity", collapsed && "lg:hidden")}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div
            className={cn(
              "my-3 border-t border-sidebar-border",
              collapsed ? "mx-3" : "mx-2",
            )}
          />
          <p
            className={cn(
              "mb-2 px-4 text-[11px] font-medium text-muted-foreground transition-opacity",
              collapsed && "lg:opacity-0",
            )}
          >
            Apps
          </p>
          {EXTERNAL_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <a
                key={app.href}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium transition-all duration-150",
                  "bg-[linear-gradient(135deg,oklch(0.54_0.12_252/0.08),oklch(0.64_0.16_252/0.06))] text-[var(--color-brand-ocean)] hover:bg-[linear-gradient(135deg,oklch(0.54_0.12_252/0.14),oklch(0.64_0.16_252/0.10))] hover:text-[var(--color-brand-bright)]",
                  collapsed && "lg:justify-center lg:px-0",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span
                  className={cn("transition-opacity", collapsed && "lg:hidden")}
                >
                  {app.label}
                </span>
                <ExternalLink
                  className={cn(
                    "ml-auto size-3 opacity-50 transition-opacity group-hover:opacity-100",
                    collapsed && "lg:hidden",
                  )}
                />
              </a>
            );
          })}

          {isAdmin && (
            <>
              <div
                className={cn(
                  "my-3 border-t border-sidebar-border",
                  collapsed ? "mx-3" : "mx-2",
                )}
              />
              <p
                className={cn(
                  "mb-2 px-4 text-[11px] font-medium text-muted-foreground transition-opacity",
                  collapsed && "lg:opacity-0",
                )}
              >
                Admin
              </p>
              <Link
                href="/admin"
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium transition-all duration-150",
                  pathname === "/admin"
                    ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.58_0.06_255/0.14)] dark:shadow-[inset_0_0_0_1px_oklch(0.72_0.1_255/0.28)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "lg:justify-center lg:px-0",
                )}
              >
                <Shield className="size-4 shrink-0" />
                <span
                  className={cn("transition-opacity", collapsed && "lg:hidden")}
                >
                  Admin
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className="relative z-10 hidden border-t border-sidebar-border p-2 lg:flex">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-2xl px-4 text-sm text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navigation */}
        <header className="glass sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between border-b border-border/60 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-medium text-muted-foreground">
                Blueprints for Pangaea
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-3">
                <p className="truncate text-[1.1rem] font-semibold tracking-[-0.02em] text-foreground">
                  {routeMeta.title}
                </p>
                <span className="hidden text-sm text-muted-foreground lg:inline">
                  {routeMeta.subtitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8 ring-2 ring-background shadow-sm",
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  href={profileHref}
                  label="My Profile"
                  labelIcon={<User className="size-4" />}
                />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,oklch(0.98_0.02_250/0.85),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.42_0.1_258/0.3),transparent_62%)]" />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
