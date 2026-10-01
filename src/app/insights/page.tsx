import { redirect } from "next/navigation";

/** Customer Insights product is deferred — keep routes from 404ing while nav stays hidden. */
export default function InsightsIndexPage() {
  redirect("/");
}
