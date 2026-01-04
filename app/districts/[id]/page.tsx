import EntityPanel from "@/app/components/entities/panels/EntityPanel";

interface DistrictPageProps {
  params: Promise<{ id: string }>;
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-brand-secondary-1 p-4 text-brand-secondary-0">
      <EntityPanel entityId={id} entityType="district" />
    </main>
  );
}
