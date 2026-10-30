// Mock backend for Playwright E2E tests.
// Mirrors the real backend endpoints: /products, /categories, /users (register),
// and /auth/login.
// Stateful: users registered via /users are kept in memory so a subsequent
// login can return the same username.

import { createServer } from 'node:http';

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 4000;

// Static product data. Laptop is intentionally given id 1 so it matches
// getByTestId('product-1') in the tests.
const PRODUCTS = [
    { id: 1, name: 'Laptop', slug: 'laptop', category_id: 1, price: 15000000, stock_quantity: 5, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Keyboard', slug: 'keyboard', category_id: 2, price: 1500000, stock_quantity: 4, created_at: '2026-01-01T00:00:00Z' },
    { id: 3, name: 'Mouse', slug: 'mouse', category_id: 2, price: 500000, stock_quantity: 0, created_at: '2026-01-01T00:00:00Z' },
];

// Static categories. The category_id on each product refers to an id here.
const CATEGORIES = [
    { id: 1, name: 'Electronics', is_active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, name: 'Accessories', is_active: true, created_at: '2026-01-01T00:00:00Z' },
    // Matched by the "Grinders" tile on the home page.
    { id: 3, name: 'Coffee Grinder', is_active: true, created_at: '2026-01-01T00:00:00Z' },
];

// In-memory user store (reset every time the server starts).
const users = new Map(); // key: email -> { id, username, email, password, role }
let nextUserId = 1;

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch {
                resolve({});
            }
        });
    });
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    const method = req.method ?? 'GET';

    // CORS preflight
    if (method === 'OPTIONS') {
        sendJson(res, 204, {});
        return;
    }

    // GET /products (optionally filtered by category_id query param)
    if (path === '/products' && method === 'GET') {
        const categoryId = url.searchParams.get('category_id');
        const list = categoryId
            ? PRODUCTS.filter((p) => String(p.category_id) === categoryId)
            : PRODUCTS;
        sendJson(res, 200, list);
        return;
    }

    // GET /products/:id or /products/:slug (mirrors the two backend routes)
    const detailMatch = path.match(/^\/products\/([^/]+)$/);
    if (detailMatch && method === 'GET') {
        const key = decodeURIComponent(detailMatch[1]);
        const product = /^\d+$/.test(key)
            ? PRODUCTS.find((p) => p.id === Number(key))
            : PRODUCTS.find((p) => p.slug === key);
        if (product) sendJson(res, 200, product);
        else sendJson(res, 404, { error: `Product ${key} not found` });
        return;
    }

    // GET /categories
    if (path === '/categories' && method === 'GET') {
        sendJson(res, 200, CATEGORIES);
        return;
    }

    // POST /users (register)
    if (path === '/users' && method === 'POST') {
        const body = await readBody(req);
        const { username, email, password } = body;

        if (!username || !email || !password) {
            sendJson(res, 400, { field: 'email', error: 'Missing required fields' });
            return;
        }
        if (users.has(email)) {
            sendJson(res, 409, { message: 'Email already registered' });
            return;
        }

        const user = { id: nextUserId++, username, email, password, role: 'user' };
        users.set(email, user);
        sendJson(res, 201, {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            is_active: true,
            created_at: new Date().toUTCString(),
        });
        return;
    }

    // POST /auth/login
    if (path === '/auth/login' && method === 'POST') {
        const body = await readBody(req);
        const { email, password } = body;
        const user = users.get(email);

        if (!user || user.password !== password) {
            sendJson(res, 401, { success: false, message: 'Invalid email or password' });
            return;
        }

        sendJson(res, 200, {
            success: true,
            access_token: 'mock-token-' + user.id,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
        return;
    }

    // POST /orders (checkout). Mirrors the real backend: computes total_price
    // from the mocked products and returns the created order with status 201.
    if (path === '/orders' && method === 'POST') {
        const body = await readBody(req);
        const { user_id, items } = body;

        // Like the real backend, the buyer comes from the JWT, so only items are required.
        if (!req.headers.authorization) {
            sendJson(res, 401, { msg: 'Missing Authorization Header' });
            return;
        }
        if (!Array.isArray(items) || items.length === 0) {
            sendJson(res, 400, { error: 'items are required' });
            return;
        }

        let totalPrice = 0;
        const orderItems = [];
        for (const item of items) {
            const product = PRODUCTS.find((p) => p.id === item.product_id);
            if (!product) {
                sendJson(res, 404, { error: 'One or more product_id(s) not found' });
                return;
            }
            totalPrice += product.price * item.quantity;
            orderItems.push({
                product_id: product.id,
                quantity: item.quantity,
                price_at_order: product.price,
                name: product.name,
                slug: product.slug,
            });
        }

        // Same shipping rules as the real backend.
        const SHIPPING = { regular: 5, fast: 15, cargo: 8 };
        const method = body.shipping_method;
        const shippingCost = !method ? 0 : method === 'regular' && totalPrice >= 50 ? 0 : SHIPPING[method] ?? 0;

        sendJson(res, 201, {
            ...body,
            id: 1,
            user_id: user_id ?? 2,
            total_price: totalPrice + shippingCost,
            shipping_cost: shippingCost,
            status: 'pending',
            items: orderItems,
            ordered_at: new Date().toUTCString(),
        });
        return;
    }

    // Unmocked endpoint: log it so it's easy to spot during tests.
    console.warn(`[mock-server] UNHANDLED ${method} ${path}`);
    sendJson(res, 404, { message: 'Not found: ' + method + ' ' + path });
});

server.listen(PORT, () => {
    console.log(`[mock-server] listening on http://localhost:${PORT}`);
});
