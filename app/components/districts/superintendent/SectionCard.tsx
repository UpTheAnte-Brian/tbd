import type { ReactNode } from "react";

type SectionCardProps = {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
};

export default function SectionCard({
    title,
    subtitle,
    actions,
    children,
    className,
}: SectionCardProps) {
    return (
        <section
            className={`rounded-lg border border-border-subtle bg-surface-card p-4 shadow-sm ${
                className ?? ""
            }`}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-text-on-light">
                        {title}
                    </h2>
                    {subtitle ? (
                        <p className="text-sm text-text-on-light">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}
