"use client";

type DistrictDonationsSummaryProps = {
  districtId: string;
};

/**
 * Placeholder component.
 *
 * NOTE:
 * Donations will be refactored to be received by nonprofit entities, not districts.
 * This summary will eventually aggregate donations across nonprofits related to this district
 * via entity relationships.
 */
export default function DistrictDonationsSummary({
  districtId,
}: DistrictDonationsSummaryProps) {
  return (
    <div className="mb-4 rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-brand-secondary-0">
      <h2 className="mb-2 text-lg font-semibold text-brand-secondary-0">
        Donation Summary
      </h2>

      <div className="text-sm text-brand-secondary-0 opacity-80">
        <p>
          Donation summary is temporarily disabled while we refactor donations
          to flow through nonprofit entities (not districts).
        </p>
        <p className="mt-2">
          District: <span className="font-mono">{districtId}</span>
        </p>
      </div>

      <div className="mt-4 animate-pulse">
        <div className="mb-2 h-5 w-40 rounded bg-brand-secondary-1 opacity-30" />
        <div className="mb-2 h-5 w-28 rounded bg-brand-secondary-1 opacity-30" />
        <div className="h-5 w-64 rounded bg-brand-secondary-1 opacity-30" />
      </div>
    </div>
  );
}
