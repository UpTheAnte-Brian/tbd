import { redirect } from "next/navigation";

export default function BusinessesPage() {
  redirect("/entities?type=business");
}
