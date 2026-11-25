/**
 * Who handles Android Back: the top open dialog if it can be dismissed (a non-dismissable one swallows it),
 * otherwise the screen: a non-Home screen goes Home, Home minimizes the app.
 */
export function backAction(top: { close?: () => void } | undefined, home: boolean): 'close' | 'ignore' | 'home' | 'minimize' {
  if (top) return top.close ? 'close' : 'ignore';
  return home ? 'minimize' : 'home';
}
