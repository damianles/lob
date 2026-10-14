import { UnsubscribeAlertForm } from "./unsubscribe-form";

export const dynamic = "force-dynamic";

export default async function UnsubscribeNotificationPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string; token?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-lob-navy">Stop email alerts</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Press the button to stop Lumber One Board emails to this address. Opening this page does not stop them.
      </p>
      <UnsubscribeAlertForm contactId={params.contact ?? ""} token={params.token ?? ""} />
    </main>
  );
}
