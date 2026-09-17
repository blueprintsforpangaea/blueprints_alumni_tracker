import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import AnnouncementsSection from "@/components/home/AnnouncementsSection";
import EventsSection from "@/components/home/EventsSection";
import QuickLinksSection from "@/components/home/QuickLinksSection";
import IdeaBoardSection from "@/components/home/IdeaBoardSection";
import OrgNeedsSection from "@/components/home/OrgNeedsSection";
import {
  SectionSkeleton,
  QuickLinksSkeleton,
} from "@/components/home/HomeSkeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  ExternalLink,
  Globe,
  Lightbulb,
  Network,
  TrendingUp,
  Eye,
} from "lucide-react";

export const metadata = { title: "Home — Blueprints for Pangaea" };

const PLATFORM_APPS = [
  {
    label: "Supply Request",
    description: "Quantitative research and market analysis tools.",
    href: "https://b4p-quantitative.vercel.app/",
    icon: TrendingUp,
  },
  {
    label: "External Dashboard",
    description: "Public-facing club presence and external outreach.",
    href: "https://b4p-external-view-w26.vercel.app/",
    icon: Eye,
  },
];

const HERO_PILLARS = [
  {
    icon: Globe,
    title: "Shared visibility",
    copy: "Profiles, roles, and alumni context stay easy to discover.",
  },
  {
    icon: Network,
    title: "Network coordination",
    copy: "Announcements, events, and org needs stay in one operating layer.",
  },
  {
    icon: Lightbulb,
    title: "Momentum",
    copy: "Ideas and opportunities stay attached to the Blueprints identity.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2.5rem] px-6 py-8 animate-fade-up sm:px-8 sm:py-10">
        <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,oklch(0.985_0.012_245),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.27_0.035_258),transparent_60%)]" />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-center">
          <div className="space-y-7">
            <Badge
              variant="outline"
              className="brand-chip w-fit rounded-full px-4 py-1.5 text-[11px] font-medium tracking-[0.02em] text-foreground"
            >
              Blueprints Hub
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-balance text-foreground sm:text-6xl lg:text-7xl">
                Blueprints for Pangaea Dashboard.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed tracking-[-0.01em] text-muted-foreground sm:text-xl">
                Profiles, updates, events, and team needs all in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className={buttonVariants({ size: "lg" })}
              >
                Browse Members
              </Link>
              <Link
                href="/profile/edit"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Update Your Profile
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Platform
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PLATFORM_APPS.map((app) => {
                  const Icon = app.icon;
                  return (
                    <a
                      key={app.href}
                      href={app.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-ocean),var(--color-brand-bright))] p-5 text-white shadow-[0_8px_24px_oklch(0.54_0.12_252/0.30)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_oklch(0.54_0.12_252/0.42)]"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(1_0_0/0.08),transparent_60%)]" />
                      <ExternalLink className="absolute right-4 top-4 size-3.5 opacity-50 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      <div className="relative">
                        <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-white/20">
                          <Icon className="size-4" />
                        </div>
                        <p className="text-[15px] font-semibold tracking-[-0.01em]">
                          {app.label}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                          {app.description}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {HERO_PILLARS.map(({ icon: Icon, title, copy }) => (
                <div
                  key={title}
                  className="rounded-[1.75rem] border border-border brand-surface p-5 shadow-[0_16px_30px_oklch(0.23_0.015_255/0.06)] backdrop-blur"
                >
                  <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                    {title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="brand-panel relative w-full max-w-sm overflow-hidden rounded-[2.25rem] p-8">
              <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,oklch(0.98_0.015_245),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.3_0.04_258),transparent_72%)]" />
              <div className="relative flex flex-col items-center gap-6">
                <div className="logo-plate rounded-[1.5rem] px-5 py-4">
                  <Image
                    src="/brand/blueprints-logo.png"
                    alt="Blueprints for Pangaea"
                    width={936}
                    height={556}
                    priority
                    className="h-auto w-full max-w-[16rem]"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Directory", "Events", "Org Needs", "Ideas"].map(
                    (label) => (
                      <span
                        key={label}
                        className="brand-chip rounded-full px-3 py-1.5 text-xs font-medium text-foreground"
                      >
                        {label}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 1: Announcements (2/3) + Events (1/3) */}
      <div
        id="updates"
        className="grid grid-cols-1 gap-6 animate-fade-up stagger-1 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <Suspense fallback={<SectionSkeleton rows={3} />}>
            <AnnouncementsSection />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <Suspense fallback={<SectionSkeleton rows={4} />}>
            <EventsSection />
          </Suspense>
        </div>
      </div>

      {/* Row 2: Quick links (full width) */}
      <div className="animate-fade-up stagger-2">
        <Suspense fallback={<QuickLinksSkeleton />}>
          <QuickLinksSection />
        </Suspense>
      </div>

      {/* Row 3: Idea Board (1/2) + Org Needs (1/2) */}
      <div className="grid grid-cols-1 gap-6 animate-fade-up stagger-3 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton rows={3} />}>
          <IdeaBoardSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={3} />}>
          <OrgNeedsSection />
        </Suspense>
      </div>
    </div>
  );
}
