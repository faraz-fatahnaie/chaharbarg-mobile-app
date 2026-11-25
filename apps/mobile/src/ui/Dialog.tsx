import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { backAction } from './back';

// Open dialogs, top last: only the top one reacts to Escape / Android back.
const stack: { close?: () => void }[] = [];
// how the current screen goes Home on Android back; null = already Home (App sets it every render)
let screenBack: (() => void) | null = null;
export const setScreenBack = (f: (() => void) | null) => { screenBack = f; };

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') stack.at(-1)?.close?.(); });
}
// registered once per page; with a listener present Capacitor no longer closes the app on Back, so every case is handled here
if (Capacitor.isNativePlatform()) {
  void CapApp.addListener('backButton', () => {
    const top = stack.at(-1);
    const a = backAction(top, !screenBack);
    if (a === 'close') top!.close!();
    else if (a === 'home') screenBack!();
    else if (a === 'minimize') void CapApp.minimizeApp();
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
