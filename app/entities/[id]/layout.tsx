import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

interface EntityLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function EntityLayout({
  children,
  params,
}: EntityLayoutProps) {
  const { id } = await params;
  return (
    <EntityThemeProvider entityId={id}>
      <main className="min-h-screen bg-surface-page p-4 text-text-on-light">
        {children}
      </main>
    </EntityThemeProvider>
  );
}
