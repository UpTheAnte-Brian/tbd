import EntityPanel from "@/app/components/entities/panels/EntityPanel";

interface NonprofitPageProps {
  params: Promise<{ id: string }>;
}

export default async function NonprofitPage({ params }: NonprofitPageProps) {
  const { id } = await params;
  return (
    <main className="p-4 bg-brand-primary-0 min-h-screen">
      <EntityPanel entityId={id} entityType="nonprofit" />
    </main>
  );
}
