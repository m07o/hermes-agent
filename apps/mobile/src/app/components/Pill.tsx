import clsx from 'clsx';

import type { ServerReadiness } from '@/lib/status';

export type PillTone = 'good' | 'warn' | 'bad' | 'muted';

const TONES: Record<PillTone, string> = {
  good: 'bg-mint/12 text-mint border-mint/25',
  warn: 'bg-amber/12 text-amber border-amber/25',
  bad: 'bg-rose/12 text-rose border-rose/25',
  muted: 'bg-panel-raised text-text-tertiary border-line'
};

export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: PillTone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium',
        TONES[tone]
      )}
    >
      {children}
    </span>
  );
}

/** The one-word verdict the list shows for a probed server. */
export function readinessLabel(readiness: ServerReadiness | null): { label: string; tone: PillTone } {
  switch (readiness) {
    case 'ready':
      return { label: 'Ready', tone: 'good' };

    case 'needs-signin':
      return { label: 'Sign-in', tone: 'warn' };

    case 'gateway-stopped':
      return { label: 'Gateway stopped', tone: 'warn' };

    case 'degraded':
      return { label: 'Degraded', tone: 'bad' };

    default:
      return { label: 'Unknown', tone: 'muted' };
  }
}
