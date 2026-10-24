import { ExternalLink, Info, Moon, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isNative, openInSystemBrowser } from '@/lib/connect';
import type { HermesAppInfo } from '@/lib/native';
import { HermesShell } from '@/lib/native';
import type { MobileSettings } from '@/lib/settings';

import { Screen } from '../components/Screen';

export interface SettingsScreenProps {
  onBack: () => void;
  onClearAll: () => void;
  onSettingsChange: (settings: MobileSettings) => void;
  serverCount: number;
  settings: MobileSettings;
}

const DOCS_URL = 'https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard';
const REPO_URL = 'https://github.com/NousResearch/hermes-agent';

/** Shell preferences, sign-out, and the About row. */
export function SettingsScreen({ onBack, onClearAll, onSettingsChange, serverCount, settings }: SettingsScreenProps) {
  const [info, setInfo] = useState<HermesAppInfo | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    void HermesShell.appInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  return (
    <Screen onBack={onBack} subtitle="This app, not your agent" title="Settings">
      <div className="safe-bottom flex flex-col gap-5 px-4 pt-4 pb-8">
        <section>
          <SectionTitle>While connected</SectionTitle>
          <Row
            description="Stop Android dimming the screen and dropping the connection during a long agent turn. Uses more battery."
            icon={<Moon className="size-4" />}
            label="Keep screen on"
            trailing={
              <Toggle
                checked={settings.keepAwake}
                onChange={(keepAwake) => onSettingsChange({ ...settings, keepAwake })}
              />
            }
          />
        </section>

        <section>
          <SectionTitle>Sign-in</SectionTitle>
          <div className="rounded-2xl border border-line bg-panel p-4">
            <p className="flex items-start gap-2.5 text-sm leading-6 text-text-secondary">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mint" />
              Your session lives in this app&apos;s private WebView storage, on your server&apos;s own domain — the same
              place a browser keeps it. The shell never stores your password, your Nous login, or any API key.
            </p>

            {confirming ? (
              <div className="mt-4 rounded-xl border border-rose/30 bg-rose/8 p-3">
                <p className="text-sm text-rose">Sign out of all {serverCount} saved servers?</p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-rose px-3 py-2 text-sm font-semibold text-ink active:opacity-80"
                    onClick={() => {
                      onClearAll();
                      setConfirming(false);
                    }}
                    type="button"
                  >
                    Sign out
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-line bg-panel-raised px-3 py-2 text-sm text-text-primary active:opacity-80"
                    onClick={() => setConfirming(false)}
                    type="button"
                  >
                    Keep me signed in
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="mt-4 w-full rounded-xl border border-line bg-panel-raised px-4 py-3 text-sm font-medium text-text-primary active:opacity-80 disabled:opacity-40"
                disabled={!serverCount}
                onClick={() => setConfirming(true)}
                type="button"
              >
                Sign out of all servers
              </button>
            )}
          </div>
        </section>

        <section>
          <SectionTitle>About</SectionTitle>
          <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-panel">
            <Row description={info ? `${info.version} (${info.build}) · ${info.platform}` : 'running in a browser (dev)'} icon={<Info className="size-4" />} label="Hermes Mobile" />
            <LinkRow href={DOCS_URL} label="Dashboard documentation" />
            <LinkRow href={REPO_URL} label="Hermes Agent on GitHub" />
          </div>
        </section>

        <p className="text-xs leading-5 text-text-tertiary">
          The agent itself never runs on this phone — it stays on your server, where your skills, memories and sessions
          live. To run Hermes on the device instead, use the Termux package.
        </p>
      </div>
    </Screen>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-text-tertiary uppercase">{children}</h2>;
}

function Row({
  description,
  icon,
  label,
  trailing
}: {
  description?: string;
  icon?: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5">
      {icon ? <span className="mt-0.5 text-text-tertiary">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="mt-0.5 text-xs leading-5 text-text-tertiary">{description}</p> : null}
      </div>
      {trailing}
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <button
      className="flex w-full items-center gap-3 bg-panel px-4 py-3.5 text-left active:bg-panel-raised"
      onClick={() => void openInSystemBrowser(href)}
      type="button"
    >
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <ExternalLink className="size-4 shrink-0 text-text-tertiary" />
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      aria-pressed={checked}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
        checked ? 'border-gold/60 bg-gold/25' : 'border-line bg-panel-raised'
      }`}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full transition-all ${
          checked ? 'left-6 bg-gold' : 'left-0.5 bg-text-tertiary'
        }`}
      />
    </button>
  );
}
