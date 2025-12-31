import { getDistrictDTOCached } from "@/app/data/districts-dto";
import EntityThemeProvider from "@/app/providers/EntityThemeProvider";

interface DistrictLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function DistrictLayout({
  children,
  params,
}: DistrictLayoutProps) {
  const { id: sdorgid } = await params;
  let entityId: string | null = null;
  try {
    const district = await getDistrictDTOCached(sdorgid);
    entityId = district?.entity_id ?? null;
  } catch (err) {
    console.error("Failed to resolve district entity id for branding:", err);
  }

  return (
    <EntityThemeProvider entityId={entityId}>{children}</EntityThemeProvider>
  );
}
