import EntityPanel from "@/app/components/entities/panels/EntityPanel";
import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

// @deprecated Use app/entities/[id]/layout.tsx + EntityPanel instead.
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
        className="min-h-screen bg-surface-page p-4 text-text-on-light"
        data-entity-tab={resolvedTab}
      >
        <EntityPanel entityId={entityId} />
      </main>
    </EntityThemeProvider>
  );
}
