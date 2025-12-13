"use client";

const cells = [
  "bg-district-primary-0",
  "bg-district-primary-1",
  "bg-district-primary-2",
  "bg-district-secondary-0",
  "bg-district-secondary-1",
  "bg-district-secondary-2",
  "bg-district-accent-0",
  "bg-district-accent-1",
  "bg-district-accent-2",
] as const;

export default function DistrictPaletteCube() {
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
