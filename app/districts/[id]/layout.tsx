import { DistrictBrandingProvider } from "@/app/providers/DistrictBrandingProvider";
import { getDistrictDTOCached } from "@/app/data/districts-dto";
import { getBrandingSummary } from "@/app/data/branding-summary";

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
  let brandingSummary = null;
  try {
    const district = await getDistrictDTOCached(sdorgid);
    districtUuid = district?.id ?? null;
    if (districtUuid) {
      brandingSummary = await getBrandingSummary(districtUuid);
    }
  } catch (err) {
    console.error("Failed to resolve district UUID for branding:", err);
  }

  return (
    <DistrictBrandingProvider
      districtId={districtUuid}
      initialData={brandingSummary}
    >
      {children}
    </DistrictBrandingProvider>
  );
}
