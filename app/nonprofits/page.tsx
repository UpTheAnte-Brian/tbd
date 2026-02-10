import { redirect } from "next/navigation";

export default function NonprofitsPage() {
  redirect("/entities?type=nonprofit");
}
