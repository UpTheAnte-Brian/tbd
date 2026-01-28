import Link from "next/link";
import AdminSection from "@/app/components/admin/AdminSection";

type AdminTool = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

type AdminSectionGroup = {
  title: string;
  subtitle: string;
  tools: AdminTool[];
};

const ADMIN_SECTIONS: AdminSectionGroup[] = [
  {
    title: "Ingest / Registry",
    subtitle: "Scope and import entities across your ecosystem.",
    tools: [
      {
        title: "Nonprofits",
        description: "IRS search, scope tiers, and import controls.",
        href: "/admin/nonprofits",
        tag: "Active",
      },
      {
        title: "Districts",
        description: "MDE sync, boundary health, refresh tooling.",
        href: "/admin/districts",
        tag: "Scaffolded",
      },
      {
        title: "Businesses",
        description: "MN SOS + OpenCorporates intake.",
        href: "/admin/businesses",
        tag: "Scaffolded",
      },
      {
        title: "Places",
        description: "Create city/county/state records + boundaries.",
        href: "/admin/places",
        tag: "Scaffolded",
      },
    ],
  },
  {
    title: "Data Ops",
    subtitle: "Monitor pipelines, sources, and data quality.",
    tools: [
      {
        title: "Jobs",
        description: "Runbook, last run, and failure queue.",
        href: "/admin/jobs",
        tag: "Scaffolded",
      },
      {
        title: "Sources",
        description: "Provider coverage, timestamps, API health.",
        href: "/admin/sources",
        tag: "Scaffolded",
      },
      {
        title: "QA",
        description: "Duplicates, missing EINs, broken geometry.",
        href: "/admin/qa",
        tag: "Scaffolded",
      },
    ],
  },
  {
    title: "Security",
    subtitle: "Roles, invites, and RLS smoke tests.",
    tools: [
      {
        title: "Users",
        description: "Entity users, invites, and audit trails.",
        href: "/admin/users",
        tag: "Scaffolded",
      },
      {
        title: "RLS",
        description: "Quick checks and permission diagnostics.",
        href: "/admin/rls",
        tag: "Scaffolded",
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Nonprofit scope queue", href: "/admin/nonprofits" },
  { label: "Jobs dashboard", href: "/admin/jobs" },
  { label: "Source coverage", href: "/admin/sources" },
  { label: "QA triage", href: "/admin/qa" },
];

function AdminToolCard({ tool }: { tool: AdminTool }) {
  return (
    <Link
      href={tool.href}
      className="group flex h-full flex-col justify-between rounded-xl border border-border-subtle bg-surface-inset p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary-1 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-on-light">
            {tool.title}
          </h3>
          <p className="mt-1 text-sm text-brand-secondary-0">
            {tool.description}
          </p>
        </div>
        <span className="rounded-full border border-border-subtle bg-surface-card px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-secondary-0">
          {tool.tag}
        </span>
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-0">
        Open tool
      </div>
    </Link>
  );
}

export default function AdminCardGrid() {
  return (
    <div className="space-y-6">
      {ADMIN_SECTIONS.map((section) => (
        <AdminSection
          key={section.title}
          title={section.title}
          subtitle={section.subtitle}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {section.tools.map((tool) => (
              <AdminToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </AdminSection>
      ))}
      <AdminSection
        title="Quick links"
        subtitle="Shortcuts to the tools you reach for most."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-sm font-medium text-brand-primary-0 transition hover:border-brand-primary-1 hover:bg-surface-card"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
