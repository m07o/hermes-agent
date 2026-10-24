import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ScreenProps {
  actions?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  subtitle?: string;
  title: string;
}

/**
 * The shell's page frame: a fixed header, a scrolling body, and an optional
 * pinned footer. Phone-sized, thumb-reachable, and the only place safe-area
 * insets are applied so screens never repeat them.
 */
export function Screen({ actions, children, onBack, subtitle, title }: ScreenProps) {
  return (
    <div className="flex h-full flex-col bg-ink text-text-primary">
      <header className="safe-top shrink-0 border-b border-line-soft bg-ink/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          {onBack ? (
            <button
              aria-label="Back"
              className="-ml-1 flex size-9 items-center justify-center rounded-full text-text-secondary active:bg-panel-raised"
              onClick={onBack}
              type="button"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-text-tertiary">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    </div>
  );
}
