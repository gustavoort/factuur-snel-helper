/**
 * Open a new tab synchronously inside the click handler and point it at a URL
 * that is only known after an API call. Calling window.open after an await is
 * treated as an unsolicited popup and blocked by mobile Safari and others.
 */
export function openPendingTab(): Window | null {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  return tab;
}

/** Send the pending tab to the URL; fall back to the current tab if it was blocked. */
export function resolvePendingTab(tab: Window | null, url: string): void {
  if (!/^https:\/\//i.test(url)) {
    tab?.close();
    return;
  }
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    window.location.assign(url);
  }
}

export function cancelPendingTab(tab: Window | null): void {
  if (tab && !tab.closed) tab.close();
}
