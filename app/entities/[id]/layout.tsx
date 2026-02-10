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
      <main className="min-h-screen bg-brand-secondary-1 p-4 text-brand-secondary-0">
        {children}
      </main>
    </EntityThemeProvider>
  );
}
