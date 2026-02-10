import { redirect } from "next/navigation";

export default function DistrictsPage() {
  redirect("/entities?type=district");
}
