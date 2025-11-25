"use client";
import Breadcrumbs from "@/app/components/nav/breadcrumbs";
import { useNonprofit } from "@/app/hooks/useNonprofit";
import LoadingSpinner from "@/app/components/loading-spinner";
import { useParams } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import NonprofitPanels from "@/app/components/nonprofits/NonprofitPanels";

export default function NonprofitPage() {
  const params = useParams();
  const { id } = params;
  const { user, loading: userLoading, error: userError } = useUser();
  console.log("user: ", user);
  const {
    nonprofit,
    loading: nonprofitLoading,
    error: nonprofitError,
    reload: reloadNonprofit,
  } = useNonprofit(id as string);

  if (userError) {
    console.warn("No user session");
  }

  if (nonprofitLoading) return <LoadingSpinner />;
  if (!nonprofit || nonprofitError) return <p>No nonprofit found</p>;

  return (
    <main className="p-4">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Nonprofits", href: "/nonprofits" },
          {
            label: nonprofit.name,
            href: `/nonprofits/${nonprofit.id}`,
            active: true,
          },
        ]}
      />

      {userLoading ? (
        <LoadingSpinner />
      ) : (
        <div>
          <NonprofitPanels
            nonprofit={nonprofit}
            // user={user}
            reloadNonprofit={reloadNonprofit}
          />
        </div>
      )}
    </main>
  );
}
