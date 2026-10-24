import { LogOut, Pencil, RefreshCw, Trash2 } from 'lucide-react';

import type { ProbeState } from '@/app/hooks/use-server-probes';
import type { HermesServer } from '@/lib/servers';
import { statusSummary } from '@/lib/status';

import { Pill, readinessLabel } from './Pill';

export interface ServerCardProps {
  onEdit: (server: HermesServer) => void;
  onOpen: (server: HermesServer) => void;
  onReprobe: (server: HermesServer) => void;
  onRemove: (server: HermesServer) => void;
  onSignOut: (server: HermesServer) => void;
  probe: ProbeState;
  server: HermesServer;
}

/** One saved Hermes server, with what the last probe learned about it. */
export function ServerCard({ onEdit, onOpen, onReprobe, onRemove, onSignOut, probe, server }: ServerCardProps) {
  const outcome = probe.outcome;
  const hermes = outcome?.kind === 'hermes' ? outcome : null;
  const verdict = readinessLabel(hermes?.readiness ?? null);

  const detail =
    outcome?.kind === 'unreachable' || outcome?.kind === 'not-hermes'
      ? outcome.detail
      : hermes
        ? statusSummary(hermes.status)
        : probe.loading
          ? 'Checking…'
          : 'Not checked yet';

  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{server.label}</h2>
          <p className="mono truncate text-xs text-text-tertiary">{server.href.replace(/^https?:\/\//, '')}</p>
        </div>
        {probe.loading ? <RefreshCw className="size-4 shrink-0 animate-spin text-text-tertiary" /> : null}
        <Pill tone={verdict.tone}>{verdict.label}</Pill>
      </div>

      <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{detail}</p>

      {!server.secure ? (
        <p className="mt-2 rounded-lg border border-amber/25 bg-amber/8 px-2.5 py-1.5 text-[11px] leading-4 text-amber">
          Plain http:// — allowed in debug builds and for on-device servers. A release build blocks it unless the host
          is localhost.
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          className="flex-1 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-ink active:opacity-80"
          onClick={() => onOpen(server)}
          type="button"
        >
          Open
        </button>
        <IconButton label="Check again" onClick={() => onReprobe(server)}>
          <RefreshCw className="size-4" />
        </IconButton>
        <IconButton label="Sign out" onClick={() => onSignOut(server)}>
          <LogOut className="size-4" />
        </IconButton>
        <IconButton label="Edit" onClick={() => onEdit(server)}>
          <Pencil className="size-4" />
        </IconButton>
        <IconButton label="Remove" onClick={() => onRemove(server)}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </article>
  );
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-xl border border-line bg-panel-raised text-text-secondary active:text-text-primary"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
