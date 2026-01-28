type KpiItem = {
    label: string;
    value: string;
    helper?: string;
    tone?: "neutral" | "good" | "warn";
    loading?: boolean;
};

type KpiRowProps = {
    items: KpiItem[];
};

const toneClasses: Record<NonNullable<KpiItem["tone"]>, string> = {
    neutral: "border-border-subtle",
    good: "border-emerald-300",
    warn: "border-amber-300",
};

export default function KpiRow({ items }: KpiRowProps) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {items.map((item) => (
                <div
                    key={item.label}
                    className={`rounded-md border bg-brand-primary-1 p-3 shadow-sm ${
                        toneClasses[item.tone ?? "neutral"]
                    }`}
                >
                    <div className="text-xs uppercase tracking-wide text-text-on-light">
                        {item.label}
                    </div>
                    {item.loading ? (
                        <div className="mt-3 h-5 w-16 animate-pulse rounded bg-surface-inset" />
                    ) : (
                        <div className="mt-2 text-xl font-semibold text-text-on-light">
                            {item.value}
                        </div>
                    )}
                    {item.helper ? (
                        <div className="mt-1 text-xs text-text-on-light">
                            {item.helper}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
