import EntityPanel from "@/app/components/entities/panels/EntityPanel";
import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

interface NonprofitPageProps {
  params: Promise<{ id: string }>;
}

export default async function NonprofitPage({ params }: NonprofitPageProps) {
  const { id } = await params;
  return (
    <EntityThemeProvider entityId={id}>
      <main className="p-4 bg-brand-primary-0 min-h-screen">
        <EntityPanel entityId={id} entityType="nonprofit" />
      </main>
    </EntityThemeProvider>
  );
}
