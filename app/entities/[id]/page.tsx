import EntityPageShell from "@/app/components/entities/EntityPageShell";

interface EntityPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function EntityPage({
  params,
  searchParams,
}: EntityPageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  return (
    <EntityPageShell entityId={id} tab={resolvedSearchParams.tab ?? null} />
  );
}
