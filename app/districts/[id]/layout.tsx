import { DistrictBrandingProvider } from "@/app/providers/DistrictBrandingProvider";
import { getDistrictDTOCached } from "@/app/data/districts-dto";

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
  let districtUuid: string | null = null;
  try {
    const district = await getDistrictDTOCached(sdorgid);
    districtUuid = district?.id ?? null;
  } catch (err) {
    console.error("Failed to resolve district UUID for branding:", err);
  }

  return (
    <DistrictBrandingProvider districtId={districtUuid}>
      {children}
    </DistrictBrandingProvider>
  );
}
