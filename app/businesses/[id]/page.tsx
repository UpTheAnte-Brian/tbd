import { redirect } from "next/navigation";
import { entityPath } from "@/app/lib/routes";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { id } = await params;
  redirect(entityPath(id));
}
