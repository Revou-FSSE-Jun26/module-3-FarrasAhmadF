import { test, expect, Page, Route } from '@playwright/test';

// Logged-in admin is user 1.
const ME = { id: 1, username: 'boss', email: 'boss@email.com', role: 'admin' };

function seed() {
    return Array.from({ length: 14 }, (_, i) => {
        const id = i + 1;
        return {
            id,
            username: id === 1 ? 'boss' : `user${String(id).padStart(2, '0')}`,
            email: id === 1 ? 'boss@email.com' : `user${id}@email.com`,
            role: id === 1 || id === 7 ? 'admin' : 'user',
            is_active: id !== 4,
            created_at: new Date(Date.UTC(2026, 0, id)).toUTCString(),
        };
    });
}

async function setup(page: Page) {
    const users = seed();
    const requests: { method: string; path: string; body: unknown }[] = [];
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'admin-token');
    }, ME);

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (route: Route, status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    await page.route(/:4000\/users/, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        requests.push({ method: req.method(), path: url.pathname + url.search, body: req.postDataJSON?.() ?? null });
        if (req.headers()['authorization'] !== 'Bearer admin-token') return json(route, 401, { msg: 'Missing Authorization Header' });

        const one = url.pathname.match(/^\/users\/(\d+)$/);
        const restore = url.pathname.match(/^\/users\/restore\/(\d+)$/);
        const find = (id: string) => users.find((u) => u.id === Number(id));

        if (req.method() === 'GET' && url.pathname === '/users') return json(route, 200, users);
        if (req.method() === 'GET' && one) {
            const u = find(one[1]);
            return u ? json(route, 200, u) : json(route, 404, { error: 'not found' });
        }
        if (req.method() === 'DELETE' && one) {
            find(one[1])!.is_active = false;
            return json(route, 200, { message: 'User deleted successfully' });
        }
        if (req.method() === 'PUT' && restore) {
            const u = find(restore[1])!;
            u.is_active = true;
            return json(route, 200, { message: 'User restored successfully', user: u });
        }
        if (req.method() === 'PUT' && one) {
            const body = req.postDataJSON();
            if (body.email === 'taken@email.com') return json(route, 409, { error: 'Email already registered' });
            const u = find(one[1])!;
            Object.assign(u, { ...body, password: undefined });
            return json(route, 200, u);
        }
        if (req.method() === 'POST' && url.pathname === '/users') {
            const body = req.postDataJSON();
            return json(route, 201, { id: 15, username: body.username, email: body.email, role: body.role, is_active: true, created_at: new Date().toUTCString() });
        }
        return route.continue();
    });
    page.on('dialog', (d) => d.accept());
    return { requests };
}

const rows = (page: Page) => page.getByTestId(/^admin-user-\d+$/);

test('lists users with status, role and joined date', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/users');

    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Full Name/ })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: /Last Active/ })).toHaveCount(0);
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByTestId('showing')).toHaveText('Showing 1 to 10 of 14 entries');
    await expect(page.getByTestId('admin-user-2')).toContainText('user2@email.com');
    await expect(page.getByTestId('admin-user-2')).toContainText('January 2, 2026');
    await expect(page.getByTestId('admin-status-4')).toHaveText('Deactive');
    await expect(page.getByTestId('admin-role-7')).toHaveText('admin');
    await expect(page.getByTestId('add-user')).toHaveAttribute('href', '/dashboard/users/new');
    await expect(page.getByTestId('edit-2')).toHaveAttribute('href', '/dashboard/users/2');
    expect(requests.some((r) => r.path === '/users?include_inactive=true')).toBe(true);
});

test('search, role and status filters', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/users');

    await page.getByTestId('role-filter').selectOption('admin');
    await expect(rows(page)).toHaveCount(2);
    await page.getByTestId('role-filter').selectOption('all');

    await page.getByTestId('status-filter').selectOption('inactive');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('user04');
    await page.getByTestId('status-filter').selectOption('all');

    await page.getByTestId('user-search').fill('user1');
    await expect(rows(page)).toHaveCount(5); // user10..user14
    await page.getByTestId('user-search').fill('nobody');
    await expect(page.getByTestId('users-empty')).toBeVisible();
});

test('deactivate, reactivate, and you cannot deactivate yourself', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/users');

    await expect(page.getByTestId('deactivate-1')).toBeDisabled();
    await expect(page.getByTestId('admin-user-1')).toContainText('(you)');

    await page.getByTestId('deactivate-2').click();
    await expect(page.getByTestId('admin-status-2')).toHaveText('Deactive');
    await page.getByTestId('activate-2').click();
    await expect(page.getByTestId('admin-status-2')).toHaveText('Active');
});

test('bulk deactivate skips your own account', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/users');
    await page.getByRole('checkbox', { name: 'Select all users on this page' }).check();
    // 10 on the page, minus yourself and the already inactive user04.
    await expect(page.getByTestId('bulk-deactivate')).toHaveText('Deactivate (8)');
    await page.getByTestId('bulk-deactivate').click();
    await expect(page.getByTestId('toast-success')).toHaveText('8 user(s) deactivated');
    await expect(page.getByTestId('admin-status-1')).toHaveText('Active');
});

test('edit a user and reset their password', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/users/2');

    await expect(page.getByRole('heading', { name: /Edit User/ })).toBeVisible();
    await expect(page.getByTestId('editor-username')).toHaveValue('user02');
    await expect(page.getByTestId('save-user')).toBeDisabled();

    await page.getByTestId('editor-role').selectOption('admin');
    await page.getByTestId('editor-password').fill('short');
    await page.getByTestId('save-user').click();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    await page.getByTestId('editor-password').fill('newpassword1');
    await page.getByTestId('editor-confirmPassword').fill('newpassword1');
    await page.getByTestId('save-user').click();
    await expect(page.getByTestId('editor-success')).toHaveText('User saved. Password has been reset.');

    // Only changed fields are sent.
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ role: 'admin', password: 'newpassword1' });
    await expect(page.getByTestId('editor-password')).toHaveValue('');
});

test('backend errors are shown and your own role is locked', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/users/2');
    await page.getByTestId('editor-email').fill('taken@email.com');
    await page.getByTestId('save-user').click();
    await expect(page.getByTestId('editor-error')).toHaveText('Email already registered');

    await page.goto('/dashboard/users/1');
    await expect(page.getByTestId('editor-role')).toBeDisabled();
});

test('add a new user and return to the list', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/users/new');
    await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();

    await page.getByTestId('save-user').click();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    await page.getByTestId('editor-username').fill('barista');
    await page.getByTestId('editor-email').fill('barista@email.com');
    await page.getByTestId('editor-role').selectOption('admin');
    await page.getByTestId('editor-password').fill('password123');
    await page.getByTestId('editor-confirmPassword').fill('password123');
    await page.getByTestId('save-user').click();

    await expect(page).toHaveURL('/dashboard/users');
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({ username: 'barista', email: 'barista@email.com', role: 'admin', password: 'password123' });
});

test('unknown user shows not found', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/users/999');
    await expect(page.getByTestId('editor-not-found')).toContainText('User not found');
});
