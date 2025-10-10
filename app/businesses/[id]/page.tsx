"use client";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { useBusiness } from "@/app/hooks/useBusiness";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";
// import BusinessPanels from "@/app/components/businesses/BusinessPanels";
import { useUser } from "@/app/hooks/useUser";

export default function BusinessPage() {
  const params = useParams();
  const { id } = params;
  const { user, error: userError } = useUser();

  const {
    business,
    loading: businessLoading,
    error: businessError,
  } = useBusiness(id as string);

  if (userError) {
    console.warn("no user session");
  }
  if (businessLoading) return <LoadingSpinner />;
  if (!business || businessError) return <p>No business found</p>;

  return (
    <main className="p-4">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          {
            label: business.name || business.id,
            href: `/businesses/${business.id}`,
            active: true,
          },
        ]}
      />
      <div>{business.name}</div>
      <div>{user?.username}</div>
      {/* <BusinessPanels business={business} user={user}></BusinessPanels> */}
    </main>
  );
}
