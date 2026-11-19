import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  NotebookPen,
  CircleDot,
  ListChecks,
  Archive,
  ShieldCheck,
  Server,
  Lock,
} from "lucide-react";
import { getSiteUrl } from "@/lib/site";

const title = "Mono — a journal you own";
const description =
  "A private, self-hosted journal. Year-in-dots, a morning/midday/evening check, a weekly letter written on your device, and local-only practice tools. Open source, sign-in only, yours.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${getSiteUrl()}/about` },
  openGraph: {
    title,
    description,
    url: `${getSiteUrl()}/about`,
    siteName: "Mono",
    type: "website",
  },
};

const siteUrl = getSiteUrl();

// Factual, minimal schema — no ratings, no invented users, no offers.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Mono",
      description,
      url: siteUrl,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript.",
      isAccessibleForFree: true,
      author: {
        "@type": "Person",
        name: "nonshox",
        url: "https://github.com/nonshox",
      },
      codeRepository: "https://github.com/nonshox/mono",
      softwareVersion: "0.1.0",
    },
  ],
};

const FEATURES = [
  {
    icon: CircleDot,
    title: "The year in dots",
    body: "One dot per day for the whole year. Write into the dot; the dot holds it. Some months fill fast, some stay quiet — both are fine.",
  },
  {
    icon: NotebookPen,
    title: "A journal that reads itself",
    body: "Search spanning every year, on-this-day resurfacing, local themes from what you keep returning to. All computed on your machine.",
  },
  {
    icon: ListChecks,
    title: "Three buckets",
    body: "Rise, midday, evening. A fixed, opinionated checklist — no config files, no decision fatigue, just the same small things each day.",
  },
  {
    icon: Archive,
    title: "A stash that never leaves the device",
    body: "Files, vocabulary with spaced repetition, breath and sound tools. Everything local, no account, no sync service — here for when your phone is enough.",
  },
] as const;

const WHY = [
  {
    icon: Lock,
    title: "Sign-in only, by design",
    body: "No public gallery, no sharing links, no social feed. Email yourself a code and sign in. The archive is yours alone — nothing renders for anyone else.",
  },
  {
    icon: Server,
    title: "Self-hosted, or not at all",
    body: "Mono is a template you run: your Appwrite instance, your entries, your exports. No vendor can sunset it, leak it, or raise the price of your own words.",
  },
  {
    icon: ShieldCheck,
    title: "No tracking, no AI by default",
    body: "No analytics, no telemetry, no third-party scripts. The optional Sunday letter is compiled locally from your entries — nothing you write is transmitted for training.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Minimal chrome — same restraint as the app */}
      <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
        <span className="type-brand text-foreground">Mono</span>
        <Link
          className="text-xs font-semibold text-foreground outline-none underline decoration-border underline-offset-4 transition hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
          href="/auth"
        >
          Sign in
        </Link>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:pt-16">
        {/* Hero — the thesis, no badges, no numbers */}
        <h1 className="type-title text-4xl leading-[1.08] sm:text-6xl">
          A journal you own.<br />
          All the way down.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-foreground sm:text-lg">
          Mono is a private, self-hosted journal and daily practice. Write a dot
          a day, check your three buckets, read back a year of your own words.
          Open the source, run it yourself, keep it forever.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
            href="https://github.com/nonshox/mono"
            rel="noreferrer"
          >
            Self-host Mono
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </a>
          <Link
            className="inline-flex h-11 items-center rounded-full border-2 border-border px-6 text-sm font-semibold outline-none transition hover:border-foreground/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            href="/auth"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-foreground/70">
          Next.js + Appwrite · self-host in minutes · open source (see repo)
        </p>

        {/* Features */}
        <section aria-labelledby="features-heading" className="mt-20">
          <h2
            className="type-eyebrow text-foreground/80"
            id="features-heading"
          >
            What you actually get
          </h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border-2 border-border/60 bg-border/60 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title: name, body }) => (
              <div className="bg-popover p-6" key={name}>
                <Icon
                  aria-hidden="true"
                  className="size-5 text-foreground"
                  strokeWidth={1.5}
                />
                <h3 className="mt-4 text-sm font-semibold text-foreground">{name}</h3>
                <p className="mt-1.5 text-xs leading-6 text-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Why self-host — the honest argument */}
        <section aria-labelledby="why-heading" className="mt-20">
          <h2
            className="type-eyebrow text-foreground/80"
            id="why-heading"
          >
            Why self-host
          </h2>
          <div className="mt-5 divide-y divide-border/60 border-2 border-border/60 rounded-2xl">
            {WHY.map(({ icon: Icon, title: name, body }) => (
              <div className="flex gap-4 p-5 sm:p-6" key={name}>
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-foreground"
                  strokeWidth={1.5}
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {name}
                  </h3>
                  <p className="mt-1 text-xs leading-6 text-foreground">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What Mono is not — the trust signal nobody fakes */}
        <section aria-labelledby="not-heading" className="mt-20">
          <h2
            className="type-eyebrow text-foreground/80"
            id="not-heading"
          >
            What Mono is not
          </h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-foreground sm:grid-cols-2">
            {[
              "A SaaS with a leaderboard",
              "A social network with followers",
              "A streak factory or habit guilt-trip",
              "An AI therapist or an HR tool",
              "A SaaS you need a credit card for",
              "Another app that will sunset in three years",
            ].map((item) => (
              <li className="flex items-start gap-2" key={item}>
                <span aria-hidden="true" className="mt-0.5 text-foreground/50">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing — eyebrow + quiet CTA */}
        <section className="mt-20 border-t border-border/60 pt-10">
          <p className="type-eyebrow">The promise</p>
          <p className="mt-3 max-w-xl text-base leading-7 text-foreground">
            If you write here for a year, Mono should read like a person you
            didn&apos;t quite know yet — in your own words, arranged by a machine
            you fully control.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
              href="https://github.com/nonshox/mono"
              rel="noreferrer"
            >
              Read the source on GitHub
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </a>
            <Link
              className="inline-flex h-11 items-center rounded-full border-2 border-border px-6 text-sm font-semibold outline-none transition hover:border-foreground/50 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              href="/auth"
            >
              Sign in
            </Link>
          </div>
        </section>
      </article>

      <footer className="border-t border-border/60 px-5 py-6 text-center text-[11px] leading-5 text-foreground/70">
        Mono is open source · see the repository · built for one person,
        shared quietly with people who need it.
      </footer>
    </main>
  );
}
