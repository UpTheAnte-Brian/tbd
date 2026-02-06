import DistrictNonprofitDetailClient from "./_components/DistrictNonprofitDetailClient";

interface DistrictNonprofitPageProps {
  params: Promise<{ id: string; ein: string }>;
}

export default async function DistrictNonprofitPage({
  params,
}: DistrictNonprofitPageProps) {
  const { id, ein } = await params;

  return (
    <main className="min-h-screen bg-brand-secondary-1 p-4 text-brand-secondary-0">
      <DistrictNonprofitDetailClient districtEntityId={id} ein={ein} />
    </main>
  );
}
