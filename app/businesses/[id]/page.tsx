import Breadcrumbs from "@/app/components/nav/breadcrumbs";
import EntityPanel from "@/app/components/entities/panels/EntityPanel";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { id } = await params;
  return (
    <main className="p-4">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          { label: id, href: `/businesses/${id}`, active: true },
        ]}
      />
      <EntityPanel entityId={id} entityType="business" />
    </main>
  );
}
