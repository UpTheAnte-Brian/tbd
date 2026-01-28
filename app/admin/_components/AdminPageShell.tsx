import type { ReactNode } from "react";

type AdminPageShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AdminPageShell({
  title,
  subtitle,
  children,
}: AdminPageShellProps) {
  return (
    <div className="min-h-screen bg-surface-page px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {title ? (
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-text-on-light">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-brand-secondary-0">{subtitle}</p>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
