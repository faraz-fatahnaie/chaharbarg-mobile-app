import { Component, type ReactNode } from 'react';
import { getProfile } from '../lib/store';
import { abandonSaved } from '../screens/game/settle';

function Fallback() {
  let fa = true;
  try { fa = getProfile().settings.lang !== 'en'; } catch { /* the store itself may be what broke */ }
  const tr = (f: string, e: string) => (fa ? f : e);
  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-label={tr('خطا', 'Error')} dir={fa ? 'rtl' : 'ltr'}>
      <div className="sheet col" style={{ textAlign: 'center' }}>
        <h2>{tr('مشکلی پیش آمد', 'Something went wrong')}</h2>
        <span className="mute">{tr('بازی نیمه‌تمام به‌عنوان انصراف ثبت می‌شود تا برنامه دوباره باز شود.', 'The match in progress is recorded as a forfeit so the app can start again.')}</span>
        <button className="btn primary" autoFocus onClick={() => { abandonSaved(); location.reload(); }}>{tr('بازگشت به خانه', 'Back to home')}</button>
      </div>
    </div>
  );
}

/** Last line of defence: a render crash shows a way home instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error(err); }
  render() { return this.state.failed ? <Fallback /> : this.props.children; }
}
