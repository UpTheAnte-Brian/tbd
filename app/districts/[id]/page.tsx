import { redirect } from "next/navigation";
import { entityPath } from "@/app/lib/routes";

interface DistrictPageProps {
  params: Promise<{ id: string }>;
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { id } = await params;
  redirect(entityPath(id));
}
