import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import type { ProbeOutcome } from '@/lib/probe';
import { probeServer } from '@/lib/probe';
import { parseServerUrl, ServerUrlError } from '@/lib/server-url';
import type { HermesServer } from '@/lib/servers';
import { statusSummary } from '@/lib/status';

import { readinessLabel } from '../components/Pill';
import { Screen } from '../components/Screen';

export interface AddServerScreenProps {
  editing: HermesServer | null;
  onCancel: () => void;
  onSave: (input: { href: string; label: string }) => void;
}

interface FormState {
  address: string;
  label: string;
}

/**
 * Add or edit one server address.
 *
 * "Check" probes `/api/status` before anything is saved, so a typo or a stopped
 * gateway is caught here instead of after the WebView has navigated away from
 * the shell and there is no UI left to report it in.
 */
export function AddServerScreen({ editing, onCancel, onSave }: AddServerScreenProps) {
  const [form, setForm] = useState<FormState>({
    address: editing?.href ?? '',
    label: editing?.label ?? ''
  });

  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<ProbeOutcome | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  async function check(): Promise<void> {
    setAddressError(null);
    setOutcome(null);

    let parts;

    try {
      parts = parseServerUrl(form.address);
    } catch (error) {
      setAddressError(error instanceof ServerUrlError ? error.message : 'That address could not be read.');

      return;
    }

    setChecking(true);
    setOutcome(await probeServer(parts));
    setChecking(false);
  }

  function save(): void {
    setAddressError(null);

    let href;

    try {
      href = parseServerUrl(form.address).href;
    } catch (error) {
      setAddressError(error instanceof ServerUrlError ? error.message : 'That address could not be read.');

      return;
    }

    onSave({ href, label: form.label.trim() });
  }

  const hermes = outcome?.kind === 'hermes' ? outcome : null;
  const verdict = readinessLabel(hermes?.readiness ?? null);

  return (
    <Screen onBack={onCancel} subtitle={editing ? editing.href : 'Where your agent runs'} title={editing ? 'Edit server' : 'Add server'}>
      <div className="safe-bottom flex flex-col gap-4 px-4 pt-4 pb-8">
        <Field
          hint="Host and port of your `hermes dashboard`. https:// is assumed unless you type http://."
          label="Server address"
        >
          <input
            autoCapitalize="off"
            autoCorrect="off"
            className="mono w-full rounded-xl border border-line bg-panel-raised px-3.5 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none"
            inputMode="url"
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="hermes.example.com:9119"
            spellCheck={false}
            value={form.address}
          />
        </Field>

        <Field hint="Shown on the server list. Leave blank to use the host." label="Name (optional)">
          <input
            className="w-full rounded-xl border border-line bg-panel-raised px-3.5 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-gold/60 focus:outline-none"
            onChange={(event) => setForm({ ...form, label: event.target.value })}
            placeholder="Home lab"
            value={form.label}
          />
        </Field>

        {addressError ? (
          <Notice title="Cannot use that address" tone="bad">
            {addressError}
          </Notice>
        ) : null}

        {hermes ? (
          <Notice title={`Found a Hermes server — ${verdict.label}`} tone={verdict.tone === 'good' ? 'good' : 'warn'}>
            <div className="mt-1 flex flex-col gap-1">
              <span>{statusSummary(hermes.status)}</span>
              {hermes.status.profiles.length ? (
                <span className="mono text-[11px] text-text-tertiary">profiles: {hermes.status.profiles.join(', ')}</span>
              ) : null}
              {hermes.status.authRequired && hermes.status.authProviders.length ? (
                <span className="mono text-[11px] text-text-tertiary">
                  sign-in: {hermes.status.authProviders.join(', ')}
                </span>
              ) : null}
            </div>
          </Notice>
        ) : null}

        {outcome?.kind === 'not-hermes' ? (
          <Notice title={`Something else answered (HTTP ${outcome.httpStatus})`} tone="warn">
            {outcome.detail} You can still save it, but the app expects a Hermes dashboard at this address.
          </Notice>
        ) : null}

        {outcome?.kind === 'unreachable' ? (
          <Notice title="Could not reach it" tone="bad">
            {outcome.detail}
          </Notice>
        ) : null}

        <div className="mt-1 flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-panel-raised px-4 py-3 text-sm font-medium text-text-primary active:opacity-80 disabled:opacity-50"
            disabled={checking || !form.address.trim()}
            onClick={() => void check()}
            type="button"
          >
            {checking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {checking ? 'Checking…' : 'Check'}
          </button>
          <button
            className="flex-1 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-ink active:opacity-80 disabled:opacity-50"
            disabled={!form.address.trim()}
            onClick={save}
            type="button"
          >
            {editing ? 'Save' : 'Add server'}
          </button>
        </div>

        <p className="text-xs leading-5 text-text-tertiary">
          Sign-in happens on the server&apos;s own page after you open it — this app never sees or stores your password
          or API keys.
        </p>
      </div>
    </Screen>
  );
}

function Field({ children, hint, label }: { children: React.ReactNode; hint: string; label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-text-secondary uppercase">{label}</span>
      {children}
      <span className="text-[11px] leading-4 text-text-tertiary">{hint}</span>
    </label>
  );
}

function Notice({ children, title, tone }: { children: React.ReactNode; title: string; tone: 'good' | 'warn' | 'bad' }) {
  const styles = {
    good: 'border-mint/25 bg-mint/8 text-mint',
    warn: 'border-amber/25 bg-amber/8 text-amber',
    bad: 'border-rose/25 bg-rose/8 text-rose'
  }[tone];

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${styles}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        {tone === 'bad' ? <TriangleAlert className="size-4 shrink-0" /> : null}
        {title}
      </p>
      <div className="text-xs leading-5 text-text-secondary">{children}</div>
    </div>
  );
}
