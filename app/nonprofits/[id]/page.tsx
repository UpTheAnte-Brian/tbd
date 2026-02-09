import { redirect } from "next/navigation";
import { entityPath } from "@/app/lib/routes";

interface NonprofitPageProps {
  params: Promise<{ id: string }>;
}

export default async function NonprofitPage({ params }: NonprofitPageProps) {
  const { id } = await params;
  redirect(entityPath(id));
}
