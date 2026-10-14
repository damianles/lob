"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { lobWoodOutlineButtonClass, lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";
import type { NotificationSettings } from "@/lib/notifications/contacts";

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(initial.contacts.map((contact) => ({ id: contact.id, preferences: contact.preferences })));

  useEffect(() => {
    setPrefs(initial.contacts.map((contact) => ({ id: contact.id, preferences: contact.preferences })));
  }, [initial]);

  function checked(contactId: string, eventId: string, fallback: boolean) {
    const row = prefs.find((item) => item.id === contactId);
    if (!row) return fallback;
    const value = row.preferences[eventId as keyof typeof row.preferences];
    return value ?? fallback;
  }

  async function run(work: () => Promise<Response>, opts?: { okMessage?: string; clearEmail?: boolean }) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await work();
      const body = (await res.json().catch(() => null)) as { error?: string; data?: { warning?: string | null } } | null;
      if (!res.ok) {
        setError(body?.error || "Could not save that change.");
        setPrefs(initial.contacts.map((contact) => ({ id: contact.id, preferences: contact.preferences })));
        return;
      }
      if (body?.data?.warning) setNotice(body.data.warning);
      else if (opts?.okMessage) setNotice(opts.okMessage);
      if (opts?.clearEmail) setEmail("");
      router.refresh();
    } catch {
      setError("Could not save that change.");
    } finally {
      setBusy(false);
    }
  }

  const groups: string[] = [];
  for (const event of initial.events) {
    if (!groups.includes(event.group)) groups.push(event.group);
  }

  return (
    <div className="space-y-6">
      {!initial.mailConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Confirmation emails are not sending yet because mail is not connected on this server. You can still save
          addresses and choices.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-lob-navy">{notice}</p> : null}

      {initial.contacts.length === 0 ? (
        <p className="text-sm text-zinc-600">No addresses yet. Finish account setup so the sign-up email can be listed.</p>
      ) : null}

      {initial.contacts.map((contact) => (
        <section key={contact.id} className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-900">{contact.email}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {contact.isAccount ? "Sign-up email" : "Extra address"}
                {contact.confirmed ? "" : " · waiting for confirmation"}
                {contact.muted ? " · emails stopped" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!contact.confirmed ? (
                <button
                  type="button"
                  disabled={busy}
                  className={lobWoodOutlineButtonClass}
                  onClick={() =>
                    void run(() => fetch(`/api/notification-contacts/${contact.id}/resend`, { method: "POST" }), {
                      okMessage: "Confirmation email sent.",
                    })
                  }
                >
                  Send link again
                </button>
              ) : null}
              {contact.muted ? (
                <button
                  type="button"
                  disabled={busy}
                  className={lobWoodOutlineButtonClass}
                  onClick={() =>
                    void run(() =>
                      fetch(`/api/notification-contacts/${contact.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ muted: false }),
                      }),
                    )
                  }
                >
                  Turn emails back on
                </button>
              ) : null}
              {!contact.isAccount ? (
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                  onClick={() =>
                    void run(() => fetch(`/api/notification-contacts/${contact.id}`, { method: "DELETE" }))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {!contact.confirmed ? (
            <p className="mt-3 text-sm text-zinc-600">
              This address gets nothing until someone opens the email and presses the confirm button.
            </p>
          ) : null}
          {contact.muted ? (
            <p className="mt-3 text-sm text-zinc-600">Emails to this address are stopped. The choices below stay saved.</p>
          ) : null}

          <div className="mt-4 space-y-4">
            {groups.map((group) => (
              <fieldset key={group}>
                <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{group}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {initial.events
                    .filter((event) => event.group === group)
                    .map((event) => (
                      <label key={event.id} className="flex items-start gap-2 text-sm text-zinc-800">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked(contact.id, event.id, Boolean(contact.preferences[event.id]))}
                          disabled={busy}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setPrefs((rows) =>
                              rows.map((row) =>
                                row.id === contact.id
                                  ? { ...row, preferences: { ...row.preferences, [event.id]: enabled } }
                                  : row,
                              ),
                            );
                            void run(() =>
                              fetch(`/api/notification-contacts/${contact.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ event: event.id, enabled }),
                              }),
                            );
                          }}
                        />
                        <span>{event.label}</span>
                      </label>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ))}

      <form
        className="rounded-lg border bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            () =>
              fetch("/api/notification-contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              }),
            { okMessage: "Confirmation email sent. They must press the button in that email.", clearEmail: true },
          );
        }}
      >
        <h2 className="text-lg font-semibold">Add an email</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Dispatch, traffic, or anyone else who should hear about loads. They do not get a login.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dispatch@company.com"
            className="min-h-11 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
            autoComplete="email"
          />
          <button type="submit" disabled={busy} className={lobWoodPrimaryButtonClass}>
            Send confirm link
          </button>
        </div>
      </form>
    </div>
  );
}
