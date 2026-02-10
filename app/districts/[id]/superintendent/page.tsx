import { redirect } from "next/navigation";
import { resolveEntityIdForRoute } from "@/app/lib/routing/resolve-entity";
import { entityPath } from "@/app/lib/routes";

interface DistrictSuperintendentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DistrictSuperintendentPage({
  params,
}: DistrictSuperintendentPageProps) {
  const { id } = await params;
  const entityId = await resolveEntityIdForRoute(id, {
    entityType: "district",
  });
  redirect(entityPath(entityId, "superintendent"));
}
