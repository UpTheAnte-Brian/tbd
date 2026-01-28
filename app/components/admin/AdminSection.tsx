import type { ReactNode } from "react";

type AdminSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export default function AdminSection({
  title,
  subtitle,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section
      className={`rounded-xl border border-border-subtle bg-surface-card p-4 shadow-sm ${
        className ?? ""
      }`}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-on-light">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-brand-secondary-0">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
