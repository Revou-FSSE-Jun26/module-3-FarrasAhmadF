/**
 * Reads ?next=/some/path from the current URL. Only same-site relative paths are
 * accepted ("/checkout"), so the param can't be abused as an open redirect
 * ("//evil.com", "https://evil.com").
 */
export function getSafeNext(fallback: string): string {
    if (typeof window === "undefined") return fallback;
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
        return next;
    }
    return fallback;
}
