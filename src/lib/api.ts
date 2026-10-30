/**
 * fetch() for authenticated backend endpoints (currently /orders).
 * - Adds `Authorization: Bearer <token>` from localStorage.
 * - On 401 (missing/expired token) it logs the user out and sends them to
 *   /login?next=<current page>, so they land back here after logging in.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + path, { ...init, headers });

    if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        const here = window.location.pathname + window.location.search;
        // Full navigation (not router.push) on purpose: AuthContext only reads localStorage
        // on load, so a reload is what actually puts the app in the logged-out state.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login?next=" + encodeURIComponent(here));
    }
    return res;
}
