"use client"

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, RotateCcw, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { PAGE_SIZES, Pagination, SortIcon, SortState, StatusBadge, ariaSort, nextSort } from "@/components/AdminTable";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

interface AdminUser {
    id: number;
    username: string;
    email: string;
    role: "user" | "admin";
    is_active: boolean;
    created_at: string;
}

type SortKey = "email" | "username" | "status" | "role" | "joined";
type Toast = { kind: "success" | "error"; text: string } | null;
type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "active" | "inactive";

const joinedFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
function formatJoined(raw: string) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "-" : joinedFmt.format(d);
}

function FilterSelect<T extends string>({label, value, onChange, options, Icon, testId}: {
    label: string;
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    Icon: typeof UserRound;
    testId: string;
}) {
    return (
        <label className="relative flex items-center">
            <span className="sr-only">{label}</span>
            <Icon className="pointer-events-none absolute left-3 size-3.5 text-neutral-500" aria-hidden />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as T)}
                className="cursor-pointer appearance-none rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-8 text-xs outline-none hover:border-black focus:border-black"
                data-testid={testId}
            >
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-neutral-500" aria-hidden />
        </label>
    );
}

export default function DashboardUsersPage() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [toast, setToast] = useState<Toast>(null);
    const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sort, setSort] = useState<SortState<SortKey>>(null);
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    useEffect(() => {
        // Admin-only list including deactivated users. 404 = empty.
        apiFetch("/users?include_inactive=true")
            .then(async (res) => {
                if (res.status === 404) return [];
                if (!res.ok) throw new Error(String(res.status));
                return res.json() as Promise<AdminUser[]>;
            })
            .then((list) => setUsers(list.map((u) => ({ ...u, is_active: u.is_active !== false }))))
            .catch(() => setLoadError("Failed to load users. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = users.filter((u) =>
            (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
            && (roleFilter === "all" || u.role === roleFilter)
            && (statusFilter === "all" || (statusFilter === "active") === u.is_active),
        );
        if (sort) {
            const dir = sort.dir === "asc" ? 1 : -1;
            const value = (u: AdminUser): string | number => {
                switch (sort.key) {
                    case "email": return u.email.toLowerCase();
                    case "username": return u.username.toLowerCase();
                    case "status": return u.is_active ? 0 : 1;
                    case "role": return u.role;
                    case "joined": return new Date(u.created_at).getTime() || 0;
                }
            };
            list.sort((a, b) => {
                const va = value(a), vb = value(b);
                return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))) * dir;
            });
        }
        return list;
    }, [users, search, roleFilter, statusFilter, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    const allOnPageSelected = pageItems.length > 0 && pageItems.every((u) => selected.has(u.id));
    // You can't deactivate yourself, so your own row never counts for bulk actions.
    const selectedActive = users.filter((u) => selected.has(u.id) && u.is_active && u.id !== me?.id);

    const resetPage = () => setPage(1);

    function toggleSelect(id: number) {
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectPage() {
        setSelected((s) => {
            const next = new Set(s);
            pageItems.forEach((u) => (allOnPageSelected ? next.delete(u.id) : next.add(u.id)));
            return next;
        });
    }

    const setBusy = (id: number, busy: boolean) =>
        setBusyIds((s) => {
            const next = new Set(s);
            if (busy) next.add(id);
            else next.delete(id);
            return next;
        });

    async function setActive(u: AdminUser, active: boolean): Promise<string | null> {
        setBusy(u.id, true);
        try {
            const res = active
                ? await apiFetch(`/users/restore/${u.id}`, { method: "PUT" })
                : await apiFetch(`/users/${u.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                return `${u.username}: ${data?.error || "request failed"}`;
            }
            setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, is_active: active } : x)));
            return null;
        } catch {
            return `${u.username}: cannot reach server`;
        } finally {
            setBusy(u.id, false);
        }
    }

    async function handleRowToggle(u: AdminUser) {
        if (u.is_active && !window.confirm(`Deactivate "${u.username}"? They won't be able to log in.`)) return;
        setToast(null);
        const error = await setActive(u, !u.is_active);
        setToast(error
            ? { kind: "error", text: error }
            : { kind: "success", text: `${u.username} ${u.is_active ? "deactivated" : "activated"}` });
    }

    async function handleBulkDeactivate() {
        if (!selectedActive.length) return;
        if (!window.confirm(`Deactivate ${selectedActive.length} user(s)? They won't be able to log in.`)) return;
        setToast(null);
        const errors: string[] = [];
        for (const u of selectedActive) {
            const error = await setActive(u, false);
            if (error) errors.push(error);
        }
        setSelected(new Set());
        const ok = selectedActive.length - errors.length;
        setToast(errors.length
            ? { kind: "error", text: `${ok} deactivated, ${errors.length} failed. ${errors.join(" · ")}` }
            : { kind: "success", text: `${ok} user(s) deactivated` });
    }

    const header = (key: SortKey, label: string) => (
        <th className="p-3 font-medium" aria-sort={ariaSort(sort, key)}>
            <button type="button" onClick={() => setSort((s) => nextSort(s, key))} className="flex cursor-pointer items-center gap-1 whitespace-nowrap hover:text-black" data-testid={`sort-${key}`}>
                {label} <SortIcon k={key} sort={sort} />
            </button>
        </th>
    );

    return (
        <main className="flex-1 bg-neutral-50 p-6 text-black">
            <h1 className="text-xl font-bold">User Management</h1>
            <p className="mt-1 text-sm text-neutral-600">Manage all users in one place. Control access and assign roles.</p>

            <div className="mt-5 rounded-md bg-white p-4 shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                            placeholder="Search"
                            aria-label="Search by username or email"
                            className="w-56 rounded-full border border-neutral-300 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-black"
                            data-testid="user-search"
                        />
                    </div>
                    <FilterSelect<RoleFilter>
                        label="Filter by role"
                        value={roleFilter}
                        onChange={(v) => { setRoleFilter(v); resetPage(); }}
                        options={[{ value: "all", label: "Role: All" }, { value: "admin", label: "Admin" }, { value: "user", label: "User" }]}
                        Icon={UserRound}
                        testId="role-filter"
                    />
                    <FilterSelect<StatusFilter>
                        label="Filter by status"
                        value={statusFilter}
                        onChange={(v) => { setStatusFilter(v); resetPage(); }}
                        options={[{ value: "all", label: "Status: All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Deactive" }]}
                        Icon={ShieldCheck}
                        testId="status-filter"
                    />

                    <div className="ml-auto flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleBulkDeactivate}
                            disabled={selectedActive.length === 0}
                            className="flex cursor-pointer items-center gap-1 rounded-full border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:bg-transparent"
                            data-testid="bulk-deactivate"
                        >
                            <Trash2 className="size-3.5" aria-hidden /> Deactivate{selectedActive.length ? ` (${selectedActive.length})` : ""}
                        </button>
                        <Link
                            href="/dashboard/users/new"
                            className="flex items-center gap-1 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                            data-testid="add-user"
                        >
                            <Plus className="size-3.5" aria-hidden /> Add User
                        </Link>
                    </div>
                </div>

                {toast && (
                    <p
                        role={toast.kind === "error" ? "alert" : "status"}
                        className={`mt-3 rounded-md px-3 py-2 text-xs ${toast.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
                        data-testid={`toast-${toast.kind}`}
                    >
                        {toast.text}
                    </p>
                )}

                {/* Table */}
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 bg-black text-left text-xs text-white [&_button:hover]:text-white [&_svg]:text-white/70">
                                <th className="w-10 p-3">
                                    <input
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        onChange={toggleSelectPage}
                                        disabled={pageItems.length === 0}
                                        aria-label="Select all users on this page"
                                        className="size-4 accent-white"
                                    />
                                </th>
                                {header("email", "Email")}
                                {header("username", "Username")}
                                {header("status", "Status")}
                                {header("role", "Role")}
                                {header("joined", "Joined Date")}
                                <th className="p-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }, (_, i) => (
                                    <tr key={i} className="border-b border-neutral-100">
                                        <td colSpan={7} className="p-3"><div className="h-8 animate-pulse rounded bg-neutral-100" /></td>
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr><td colSpan={7} role="alert" className="p-10 text-center text-sm text-red-600">{loadError}</td></tr>
                            ) : pageItems.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-sm text-neutral-500" data-testid="users-empty">
                                    {users.length ? "No users match the current filters." : "No users yet."}
                                </td></tr>
                            ) : (
                                pageItems.map((u, i) => {
                                    const isMe = u.id === me?.id;
                                    const busy = busyIds.has(u.id);
                                    return (
                                        <tr
                                            key={u.id}
                                            className={`border-b border-neutral-100 ${selected.has(u.id) ? "bg-neutral-100" : i % 2 ? "bg-neutral-50" : ""} ${u.is_active ? "" : "text-neutral-500"}`}
                                            data-testid={`admin-user-${u.id}`}
                                        >
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(u.id)}
                                                    onChange={() => toggleSelect(u.id)}
                                                    aria-label={`Select ${u.username}`}
                                                    className="size-4 accent-black"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold uppercase text-neutral-700" aria-hidden>
                                                        {u.username[0]}
                                                    </span>
                                                    <span className="truncate">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {u.username}
                                                {isMe && <span className="ml-1.5 text-[11px] text-neutral-500">(you)</span>}
                                            </td>
                                            <td className="p-3" data-testid={`admin-status-${u.id}`}><StatusBadge active={u.is_active} /></td>
                                            <td className="p-3 capitalize" data-testid={`admin-role-${u.id}`}>{u.role}</td>
                                            <td className="whitespace-nowrap p-3">{formatJoined(u.created_at)}</td>
                                            <td className="p-3">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={`/dashboard/users/${u.id}`}
                                                        className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black"
                                                        aria-label={`Edit ${u.username}`}
                                                        title="Edit"
                                                        data-testid={`edit-${u.id}`}
                                                    >
                                                        <Pencil className="size-4" aria-hidden />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRowToggle(u)}
                                                        disabled={busy || isMe}
                                                        className={`cursor-pointer rounded-md p-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                                                            u.is_active ? "text-red-600 hover:bg-red-50" : "text-green-700 hover:bg-green-50"
                                                        }`}
                                                        aria-label={`${u.is_active ? "Deactivate" : "Activate"} ${u.username}`}
                                                        title={isMe ? "You can't deactivate your own account" : u.is_active ? "Deactivate" : "Activate"}
                                                        data-testid={`${u.is_active ? "deactivate" : "activate"}-${u.id}`}
                                                    >
                                                        {u.is_active ? <Trash2 className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && !loadError && filtered.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="mt-4 flex items-center gap-2 text-xs text-neutral-600">
                            Rows per page
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
                                className="rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-black"
                                data-testid="page-size"
                            >
                                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <div className="flex-1">
                            <Pagination page={currentPage} totalPages={totalPages} start={start} shown={pageItems.length} total={filtered.length} onPage={setPage} />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
