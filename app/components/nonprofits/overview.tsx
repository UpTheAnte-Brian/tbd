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
    <div className="space-y-3 text-gray-800">
      <h2 className="text-lg font-semibold">{nonprofit.name}</h2>
      <div className="text-sm text-gray-600">
        <div>Type: {nonprofit.org_type ?? "nonprofit"}</div>
        {nonprofit.website_url ? (
          <a
            href={nonprofit.website_url}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {nonprofit.website_url}
          </a>
        ) : null}
      </div>
      {nonprofit.mission_statement ? (
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {nonprofit.mission_statement}
        </p>
      ) : (
        <p className="text-sm text-gray-500">No mission statement yet.</p>
      )}
    </div>
  );
}
