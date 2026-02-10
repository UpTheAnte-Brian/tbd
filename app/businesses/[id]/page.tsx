import { redirect } from "next/navigation";
import { entityPath } from "@/app/lib/routes";
import { resolveEntityIdForRoute } from "@/app/lib/routing/resolve-entity";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { id } = await params;
  const entityId = await resolveEntityIdForRoute(id, {
    entityType: "business",
  });
  redirect(entityPath(entityId));
}
