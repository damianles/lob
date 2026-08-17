import { redirect } from "next/navigation";

/** Old URL — keep bookmarks and emails working. */
export default async function BookedToShipmentsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    }
  }
  const q = qs.toString();
  redirect(q ? `/shipments?${q}` : "/shipments");
}
