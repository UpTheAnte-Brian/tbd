import AdminPlaceholder from "@/app/admin/_components/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminQaPage() {
  return (
    <AdminPlaceholder
      title="Admin · QA"
      description="Spot checks for duplicates, missing identifiers, and geometry gaps."
    />
  );
}
