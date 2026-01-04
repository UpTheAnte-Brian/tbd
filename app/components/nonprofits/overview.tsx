"use client";

export type NonprofitOverviewData = {
  id: string;
  name: string;
  org_type: string | null;
  website_url: string | null;
  mission_statement: string | null;
};

type Props = {
  nonprofit: NonprofitOverviewData;
};

export default function NonprofitOverview({ nonprofit }: Props) {
  return (
    <div className="space-y-3 text-brand-secondary-0">
      <h2 className="text-lg font-semibold">{nonprofit.name}</h2>
      <div className="text-sm text-brand-secondary-0 opacity-70">
        <div>Type: {nonprofit.org_type ?? "nonprofit"}</div>
        {nonprofit.website_url ? (
          <a
            href={nonprofit.website_url}
            className="text-brand-primary-0 hover:text-brand-primary-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {nonprofit.website_url}
          </a>
        ) : null}
      </div>
      {nonprofit.mission_statement ? (
        <p className="text-sm text-brand-secondary-0 whitespace-pre-line">
          {nonprofit.mission_statement}
        </p>
      ) : (
        <p className="text-sm text-brand-secondary-0 opacity-70">
          No mission statement yet.
        </p>
      )}
    </div>
  );
}
