import EntityPanel from "@/app/components/entities/panels/EntityPanel";
import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

interface NonprofitPageProps {
  params: Promise<{ id: string }>;
}

export default async function NonprofitPage({ params }: NonprofitPageProps) {
  const { id } = await params;
  return (
    <EntityThemeProvider entityId={id}>
      <main className="min-h-screen bg-brand-secondary-1 p-4 text-brand-secondary-0">
        <EntityPanel entityId={id} entityType="nonprofit" />
      </main>
    </EntityThemeProvider>
  );
}
