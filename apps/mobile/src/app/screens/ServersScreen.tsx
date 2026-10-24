import { Plus, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

import type { ProbeState } from '@/app/hooks/use-server-probes';
import type { HermesServer } from '@/lib/servers';

import { Screen } from '../components/Screen';
import { ServerCard } from '../components/ServerCard';

export interface ServersScreenProps {
  onAdd: () => void;
  onEdit: (server: HermesServer) => void;
  onOpen: (server: HermesServer) => void;
  onRemove: (server: HermesServer) => void;
  onReprobe: (server: HermesServer) => void;
  onSettings: () => void;
  onSignOut: (server: HermesServer) => void;
  probeState: (href: string) => ProbeState;
  refreshing: boolean;
  refreshAll: () => void;
  servers: readonly HermesServer[];
}

/** The landing screen: every Hermes server this phone knows about. */
export function ServersScreen({
  onAdd,
  onEdit,
  onOpen,
  onRemove,
  onReprobe,
  onSettings,
  onSignOut,
  probeState,
  refreshAll,
  refreshing,
  servers
}: ServersScreenProps) {
  return (
    <Screen
      actions={
        <>
          <HeaderButton label="Check all servers" onClick={refreshAll} spinning={refreshing}>
            <RefreshCw className="size-[18px]" />
          </HeaderButton>
          <HeaderButton label="Settings" onClick={onSettings}>
            <SettingsIcon className="size-[18px]" />
          </HeaderButton>
        </>
      }
      subtitle={servers.length ? `${servers.length} saved` : 'No server yet'}
      title="Hermes"
    >
      <div className="safe-bottom px-4 pt-4 pb-28">
        {servers.length ? (
          <div className="flex flex-col gap-3">
            {servers.map((server) => (
              <ServerCard
                key={server.href}
                onEdit={onEdit}
                onOpen={onOpen}
                onRemove={onRemove}
                onReprobe={onReprobe}
                onSignOut={onSignOut}
                probe={probeState(server.href)}
                server={server}
              />
            ))}
          </div>
        ) : (
          <EmptyState onAdd={onAdd} />
        )}
      </div>

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/95 to-transparent px-4 pt-6 pb-4">
        <button
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3.5 text-sm font-semibold text-ink active:opacity-80"
          onClick={onAdd}
          type="button"
        >
          <Plus className="size-4" />
          Add a Hermes server
        </button>
      </div>
    </Screen>
  );
}

function HeaderButton({
  children,
  label,
  onClick,
  spinning
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full text-text-secondary active:bg-panel-raised active:text-text-primary"
      onClick={onClick}
      type="button"
    >
      <span className={spinning ? 'animate-spin' : undefined}>{children}</span>
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
      <div className="flex size-11 items-center justify-center rounded-xl bg-gold/12 text-xl">☤</div>
      <h2 className="mt-4 text-base font-semibold">Connect to your Hermes</h2>
      <p className="mt-1.5 text-sm leading-6 text-text-secondary">
        Hermes runs on your own machine — a VPS, a home server, or your laptop. This app is the remote control: point it
        at that server and you get the same chat, sessions, skills and settings you have on the desktop.
      </p>

      <ol className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">
        <li>
          <span className="mono text-gold">1.</span> On the server, run <code className="mono text-text-primary">hermes dashboard --host 0.0.0.0</code>
        </li>
        <li>
          <span className="mono text-gold">2.</span> Set a sign-in (username &amp; password, or Nous Portal OAuth) — a
          non-loopback bind requires one
        </li>
        <li>
          <span className="mono text-gold">3.</span> Add its address here, e.g. <code className="mono text-text-primary">hermes.example.com:9119</code>
        </li>
      </ol>

      <button
        className="mt-5 w-full rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-ink active:opacity-80"
        onClick={onAdd}
        type="button"
      >
        Add your first server
      </button>
    </div>
  );
}
