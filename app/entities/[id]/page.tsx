import EntityPanel from "@/app/components/entities/panels/EntityPanel";
import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

interface EntityPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntityPage({ params }: EntityPageProps) {
  const { id } = await params;
  return (
    <EntityThemeProvider entityId={id}>
      <main className="p-4">
        <EntityPanel entityId={id} />
      </main>
    </EntityThemeProvider>
  );
}
