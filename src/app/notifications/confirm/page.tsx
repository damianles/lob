import { ConfirmAlertForm } from "./confirm-form";

export const dynamic = "force-dynamic";

export default async function ConfirmNotificationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-lob-navy">Confirm email alerts</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Press the button to let this address receive Lumber One Board alerts. Opening this page does not confirm it.
      </p>
      <ConfirmAlertForm token={token ?? ""} />
    </main>
  );
}
