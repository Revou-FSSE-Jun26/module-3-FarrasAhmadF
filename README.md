# RevoCoffee — RevoShop Frontend

**Live demo:** https://revocoffee.vercel.app

## Overview

RevoCoffee is the RevoShop frontend: an online store for coffee equipment (grinders, scales, kettles and accessories), built with the Next.js App Router. Shoppers can browse and search the catalog, filter by category, availability and price, add items to a slide-out cart, check out with delivery, shipping and payment details, and follow or cancel their orders. Admins get a separate dashboard with store statistics and full management of products, categories, orders and users.

The frontend talks to a separate REST API (the Module 2 Flask backend, deployed on Render) through the `NEXT_PUBLIC_API_BASE_URL` environment variable. Authentication uses a JWT returned by the backend; the user session and the cart are kept in the browser with `localStorage`.

### Demo accounts

The login page lists these accounts with a one-click "Use this account" button.

| Role  | Email             | Password      |
| ----- | ----------------- | ------------- |
| Admin | `admin@email.com` | `Password123` |
| User  | `jhon@email.com`  | `Password123` |

## Features Implemented

### Storefront pages

| Page | Route | What it does |
| --- | --- | --- |
| Home | `/` | Hero banner, store highlights, "Shop by Collection" tiles that link to each category's products. |
| Product listing | `/products` | Product grid with sidebar filters (availability, category, price range), sorting, and a product count. The selected category is kept in the URL (`?category=1,3`). |
| Product detail | `/products/[slug]` | Product image, price, stock status, description and Add to Cart. Uses a readable slug URL; unknown slugs show a "Product not found" page. |
| Search | `/products/search?q=` | Results for a product-name search, with the same filters and sorting as the product listing. |
| Category listing | `/categories` | Image tiles for every active category; each tile opens the filtered product listing. |
| Cart | `/cart` (and cart drawer) | Full-page version of the cart drawer: quantities, remove, order note, subtotal and checkout. |
| Checkout | `/checkout` | Delivery address, shipping method (Reguler / Fast / Cargo), payment method (Credit card / GoPay / QRIS), order summary and validation. Login required. |
| My orders | `/orders` | Upcoming and previous orders with a progress bar, totals and Cancel Order for pending orders. Login required. |
| Order detail | `/orders/[id]` | Items, totals, order note, customer and delivery details, and an activity timeline. Login required. |
| Login | `/login` | Login form plus the demo accounts panel. Redirects back to the page the user came from (`?next=`). |
| Register | `/register` | Account registration with validation that appears once a field is touched. |

### Admin dashboard (admin role only)

| Page | Route | What it does |
| --- | --- | --- |
| Store overview | `/dashboard` | Revenue, orders, average order value and new customers vs the previous period; revenue chart, order status, payment/shipping/province breakdowns; top products, revenue by category, stock alerts, never-sold products and oldest pending orders. Period: 7 days, 30 days, 90 days or 12 months (WIB). |
| Product management | `/dashboard/products` | Searchable, sortable, paginated product table with Active/Deactive status, bulk deactivate and reactivate. |
| Product editor | `/dashboard/products/new`, `/dashboard/products/[id]` | Create or edit name, category, price, stock, description and image URL, with live image preview and validation. |
| Category management | `/dashboard/categories`, `/new`, `/[id]` | Category table with number of active products; create, edit, deactivate and reactivate (categories with active products can't be deactivated). |
| Orders management | `/dashboard/orders`, `/[id]` | One row per order with customer, amount and status; search, status and date filters; quick "Mark as completed" / "Cancel"; detail page to update the status. |
| User management | `/dashboard/users`, `/new`, `/[id]` | Users table with role and status filters; create users, change role, reset password, deactivate and reactivate. Admins can't demote or deactivate themselves. |

A collapsible admin sidebar links all dashboard pages. Unlike the cart drawer, the page next to it stays usable while it's open.

### Major functionality

- **Authentication and roles.** Login and register against the backend. The JWT is sent as `Authorization: Bearer` on protected requests; an expired or revoked token logs the user out and returns them to login. `ProtectedRoute`, `AdminRoute` and `PublicOnlyRoute` guard pages by login state and role.
- **Header.** Search overlay with live suggestions, account menu (greeting, My Orders, Logout) for logged-in users, and a dashboard shortcut for admins.
- **Cart drawer.** Slides in from the right from any page: change quantities (capped at stock), remove items, add an order note, see free-shipping progress. Persisted in `localStorage`. Guests can use the cart and are asked to log in at checkout.
- **Checkout to order.** Sends the cart items plus delivery, shipping and payment details to `POST /orders`. The backend recalculates shipping and the total. Card and GoPay numbers are never sent or stored.
- **Search.** The search form submits to `/products/search?q=...`, so results can be refreshed, shared and navigated with the back button.
- **Soft delete.** Products, categories and users are deactivated instead of deleted, so admins can reactivate them later.
- **Feedback.** Inline success and error messages after saving, deactivating and cancelling, confirmation before destructive actions, loading skeletons and empty states.

## Technologies Used

- **Next.js 16** (App Router) — routing, server components, `next/form` for search.
- **React 19** — UI and hooks.
- **TypeScript** — static typing across the codebase.
- **Tailwind CSS 4** — styling.
- **`next/navigation`** — client-side navigation, redirects and URL search params.
- **`localStorage`** — session (user + token), cart and order note persistence.
- **`NEXT_PUBLIC_API_BASE_URL`** — environment variable that points the app at the backend API.
- **Recharts** — charts on the admin store overview.
- **lucide-react** and **react-icons** — icons.
- **Playwright** — end-to-end tests, with a bundled mock backend.
- **Vercel** — deployment platform.

## Project Structure

```
src/
  app/            Pages (App Router). dashboard/ holds every admin page.
  components/     UI components (header, cart drawer, editors, tables, ...).
  context/        AuthContext, CartContext, AdminSidebarContext.
  lib/            API client, checkout rules, order helpers, store statistics.
tests/            Playwright specs.
tests/mock-server Mock backend used by the tests.
screenshot/       Screenshots used in this README.
```

## How to Run the Project Locally

### Prerequisites

- Node.js 20+ and npm
- The backend API running locally or deployed (Module 2 Flask service)

### 1. Clone and install dependencies

```bash
git clone https://github.com/Revou-FSSE-Jun26/module-3-FarrasAhmadF.git
cd module-3-FarrasAhmadF
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Then set the backend URL in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

`NEXT_PUBLIC_API_BASE_URL` must point to the backend REST API. All product, category, auth, order and user requests go to this URL. The backend must allow the frontend's origin in its CORS settings (`CORS_ORIGINS`).

### 3. Start the development server

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Production build (optional)

```bash
npm run build
npm run start
```

## How to Run the Test Suite

The project has **240 Playwright end-to-end tests** (80 scenarios × Chromium, Firefox and WebKit) in 20 spec files. When you run them, Playwright starts a mock backend (`tests/mock-server/server.mjs`) on port `4000` and the Next.js dev server with `NEXT_PUBLIC_API_BASE_URL` pointing at the mock, so the real backend is **not** needed.

### 1. Install the Playwright browsers (first time only)

```bash
npx playwright install
```

### 2. Run all tests

```bash
npx playwright test --workers=1
```

One worker is the most reliable locally, because all tests share a single dev server.

### 3. Useful variations

```bash
# One spec file
npx playwright test tests/checkout.spec.ts

# One browser
npx playwright test --project=chromium

# Watch the browser
npx playwright test --headed

# Interactive UI runner
npx playwright test --ui
```

### 4. View the HTML report

```bash
npx playwright show-report
```

The GitHub Actions workflow (`.github/workflows/playwright.yml`) runs the same suite on every push to `main`.

## Screenshots

### Home
![Home page](./screenshot/Homepage.png)

### Product listing
![Product listing](./screenshot/Products-page.png)

### Product detail
![Product detail](./screenshot/Products-detail-page.png)

### Search results
![Search results](./screenshot/product-search-page.png)

### Category listing
![Category listing](./screenshot/category-page.png)

### Cart drawer
![Cart drawer](./screenshot/cart-drawer.png)

### Cart page
![Cart page](./screenshot/cart-page.png)

### Checkout
![Checkout](./screenshot/checkout-page.png)

### My orders
![My orders](./screenshot/orders-page.png)

### Order detail
![Order detail](./screenshot/orders-detail-page.png)

### Register
![Register](./screenshot/register-page.png)

### Login
![Login](./screenshot/login-page.png)

### Admin dashboard — store overview
![Admin dashboard](./screenshot/admin-dashboard-page.png)

### Admin — product management
![Admin product management](./screenshot/admin-products-management-page.png)

### Admin — category management
![Admin category management](./screenshot/admin-category-management-page.png)

### Admin — orders management
![Admin orders management](./screenshot/admin-orders-management-page.png)

### Admin — user management
![Admin user management](./screenshot/admin-user-management-page.png)
