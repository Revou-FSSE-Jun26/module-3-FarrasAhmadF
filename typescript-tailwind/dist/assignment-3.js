const products = [
    { id: 1, name: 'Arabica Ijen', price: 150000, category: 'Coffee beans', inStock: true },
    { id: 2, name: 'Arabica Flores', price: 125000, category: 'Coffee beans', inStock: false },
    { id: 3, name: 'Timemore C3S Grinder', price: 800000, category: 'Grinder', inStock: true },
    { id: 4, name: 'MHW-3BOMBER F74', price: 14000000, category: 'Grinder', inStock: true },
    { id: 5, name: 'La Marzocco Linea Micra', price: 80000000, category: 'Espresso Machine', inStock: true },
    { id: 6, name: 'Arabica Panama Geisha', price: 585000, category: 'Coffee beans', inStock: false }
];
let cartItems = [];
;
;
;
const getBadgeClasses = (variant) => {
    const base = 'text-xs font-semibold px-2 py-1 rounded-full';
    const variants = {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
    };
    return `${base} ${variants[variant]}`;
};
const getCardClasses = (inStock) => {
    const base = 'bg-white rounded-xl shadow-md p-4 transition flex flex-col';
    return inStock ? `${base} hover:shadow-xl` : `${base} opacity-60 grayscale`;
};
function formatRupiah(n) {
    return 'Rp ' + n.toLocaleString('id-ID');
}
;
function renderProducts(list) {
    const grid = document.getElementById('grid');
    if (grid) {
        grid.innerHTML = list.map((p) => `
        <article class='${getCardClasses(p.inStock)}'>
            <span class='${getBadgeClasses(p.inStock ? 'success' : 'error')} self-start'>
                ${p.inStock ? 'In stock' : 'Sold out'}
            </span>
            <h2 class="text-lg font-bold text-gray-900 truncate mt-2">${p.name}</h2>
            <p class="text-xl font-bold text-blue-600 mt-1">${formatRupiah(p.price)}</p>
            <span class="text-sm text-gray-500">${p.category}</span>
            <button data-id="${p.id}" ${p.inStock ? "" : "disabled"} class="add-btn w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                Add to Cart
            </button>
        </article>`).join('');
    }
}
;
function renderCart() {
    const totalItems = cartItems.reduce((n, e) => n + e.quantity, 0);
    const totalPrice = cartItems.reduce((n, e) => n + e.product.price * e.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    if (cartCount) {
        cartCount.textContent = totalItems + ' items';
    }
    ;
    if (cartTotal) {
        cartTotal.textContent = formatRupiah(totalPrice);
    }
    ;
}
;
function addToCart(id) {
    const product = products.find((p) => p.id === id);
    if (!product || !product.inStock)
        return;
    const existing = cartItems.find((e) => e.product.id === id);
    if (existing)
        existing.quantity += 1;
    else
        cartItems.push({ product, quantity: 1 });
    renderCart();
}
const grid = document.getElementById('grid');
if (grid) {
    grid.addEventListener('click', (e) => {
        if (!(e.target instanceof HTMLElement))
            return;
        const button = e.target.closest('.add-btn');
        if (button)
            addToCart(Number(button.dataset.id));
    });
}
;
const search = document.getElementById('search');
if (search) {
    search.addEventListener('input', (e) => {
        if (!(e.target instanceof HTMLInputElement))
            return;
        const term = e.target.value.toLowerCase();
        renderProducts(products.filter((p) => p.name.toLowerCase().includes(term)));
    });
}
;
renderProducts(products);
renderCart();
export {};
//# sourceMappingURL=assignment-3.js.map