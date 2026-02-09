import EntityPanel from "@/app/components/entities/panels/EntityPanel";
import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

type EntityPageShellProps = {
  entityId: string;
  tab?: string | null;
  initialTab?: string | null;
};

export default function EntityPageShell({
  entityId,
  tab,
  initialTab,
}: EntityPageShellProps) {
  const resolvedTab = tab ?? initialTab ?? "overview";
  return (
    <EntityThemeProvider entityId={entityId}>
      <main
        className="min-h-screen bg-brand-secondary-1 p-4 text-brand-secondary-0"
        data-entity-tab={resolvedTab}
      >
        <EntityPanel entityId={entityId} />
      </main>
    </EntityThemeProvider>
  );
}
