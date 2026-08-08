/**
 * Lightweight local settings (per-device).
 *
 * Clean home: hides workshop/editing chrome from the title screen so the
 * game can be seen as a player would see it. Toggled from the Case
 * Workshop; nothing is lost — the Workshop stays reachable via a faint
 * footnote link and its direct URL.
 */
const CLEAN_HOME_KEY = "cm.cleanHome";

export function isCleanHome(): boolean {
  try {
    return localStorage.getItem(CLEAN_HOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCleanHome(value: boolean): void {
  localStorage.setItem(CLEAN_HOME_KEY, value ? "1" : "0");
}
