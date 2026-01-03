import EntityPanel from "@/app/components/entities/panels/EntityPanel";

interface DistrictPageProps {
  params: Promise<{ id: string }>;
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { id } = await params;
  return (
    <main className="p-4 bg-brand-primary-0 min-h-screen">
      <EntityPanel entityId={id} entityType="district" />
    </main>
  );
}
