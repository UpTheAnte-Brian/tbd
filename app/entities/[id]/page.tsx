import EntityPanel from "@/app/components/entities/panels/EntityPanel";

interface EntityPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { id } = await params;
  return (
    <main className="p-4">
      <EntityPanel entityId={id} />
    </main>
  );
}
