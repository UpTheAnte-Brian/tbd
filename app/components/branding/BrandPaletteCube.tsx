"use client";

const cells = [
  "bg-brand-primary-0",
  "bg-brand-primary-1",
  "bg-brand-primary-2",
  "bg-brand-secondary-0",
  "bg-brand-secondary-1",
  "bg-brand-secondary-2",
  "bg-brand-accent-0",
  "bg-brand-accent-1",
  "bg-brand-accent-2",
] as const;

export default function BrandPaletteCube() {
  return (
    <div className="w-full bg-white p-2 rounded shadow-sm">
      <div className="grid grid-cols-3 grid-rows-3 gap-0 w-full overflow-hidden rounded">
        {cells.map((cls, idx) => (
          <div
            key={cls + idx}
            className={`${cls} aspect-square`}
            aria-label={cls}
          />
        ))}
      </div>
    </div>
  );
}
