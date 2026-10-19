const DISMISSED_KEY = "mermagic:starter-dismissed";

export function isStarterCardDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function dismissStarterCard() {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // The card still stays hidden in the current session.
  }
}
