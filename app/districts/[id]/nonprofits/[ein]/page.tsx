import { redirect } from "next/navigation";
import { entityPath } from "@/app/lib/routes";
import { resolveEntityIdForRoute } from "@/app/lib/routing/resolve-entity";

interface DistrictNonprofitPageProps {
  params: Promise<{ id: string; ein: string }>;
}

export default async function DistrictNonprofitPage({
  params,
}: DistrictNonprofitPageProps) {
  const { id } = await params;
  const entityId = await resolveEntityIdForRoute(id, {
    entityType: "district",
  });
  redirect(entityPath(entityId, "superintendent"));
}
