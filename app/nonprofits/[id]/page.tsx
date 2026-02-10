import { redirect } from "next/navigation";
import { entityPath } from "@/app/lib/routes";
import { resolveEntityIdForRoute } from "@/app/lib/routing/resolve-entity";

interface NonprofitPageProps {
  params: Promise<{ id: string }>;
}

export default async function NonprofitPage({ params }: NonprofitPageProps) {
  const { id } = await params;
  const entityId = await resolveEntityIdForRoute(id, {
    entityType: "nonprofit",
  });
  redirect(entityPath(entityId));
}
