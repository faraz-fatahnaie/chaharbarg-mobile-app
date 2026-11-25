import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

// Open dialogs, top last: only the top one reacts to Escape / Android back.
const stack: { close?: () => void }[] = [];
// ponytail: one history entry stands in for "a dialog is open" so Android back (no @capacitor/app installed) fires popstate
// instead of leaving the app. A dialog closed by its own button leaves that entry, so the next back press on a plain screen
// is swallowed once. Switch to App.addListener('backButton') if @capacitor/app is ever added.
let armed = false;
const arm = () => { if (armed) return; armed = true; try { history.pushState({ dialog: 1 }, ''); } catch { /* sandboxed */ } };

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') stack.at(-1)?.close?.(); });
  window.addEventListener('popstate', () => {
    armed = false;
    const top = stack.at(-1);
    if (!top) return;
    top.close?.();
    // a dialog that can't be dismissed (deal summary, hand-off…) or one still underneath keeps the back button captured
    if (!top.close || stack.length > 1) arm();
  });
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

/** Modal dialog: role/aria-modal, focus moves in on open and back out on close, Escape / Android back call onClose (omit it to make it non-dismissable). */
export function Dialog({ label, onClose, className = 'modal', style, onBackdrop, children }: {
  label: string; onClose?: () => void; className?: string; style?: CSSProperties; onBackdrop?: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const entry = useRef<{ close?: () => void }>({});
  entry.current.close = onClose;
  useEffect(() => {
    const e = entry.current;
    stack.push(e);
    arm();
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    (el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus();
    return () => {
      stack.splice(stack.indexOf(e), 1);
      if (prev?.isConnected) prev.focus();
    };
  }, []);
  return (
    // the backdrop click is a pointer shortcut for Escape / the dialog's own close button, so it needs no role of its own
    <div ref={ref} className={className} style={style} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      onClick={onBackdrop && ((e) => { if (e.target === e.currentTarget) onBackdrop(); })}>
      {children}
    </div>
  );
}
