const users = [
    {name: 'Putri Tunjang', email: 'puput@email.com', origin: 'Jakarta', phone: '082147659876'},
    {name: 'Bimo P.', email: 'bimbim@email.com', origin: 'Malang', phone: '08527776998'},
    {name: 'Abdul Jafar', email: 'dudul@email.com', origin: 'Yogyakarta', phone: '087790124364'},
    {name: 'Deddy Mulyodi', email: 'deded@email.com', origin: 'Bandung', phone: '081266673245'}
];

let searchTerm = '';

function makeCard(p) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
        <h3>${p.name}</h3>
        <p class="email">Email : ${p.email}</p>
        <p class="origin">Origin: ${p.origin}</p>
        <p class="phone">Phone: ${p.phone}</p>`;
    return card;
};

const getVisible = () => {
    return users.filter((p) => p.name.toLowerCase().includes(searchTerm));
};

const grid = document.getElementById('grid')

const render = () => {
    const visible = getVisible();
    grid.innerHTML = '';
    visible.forEach((p) => grid.appendChild(makeCard(p)));
};

document.getElementById('search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    render();
});

document.getElementById('add-contact').addEventListener('submit', (e) => {
    e.preventDefault();
    users.push({name: e.target.name.value, email: e.target.email.value, origin: e.target.origin.value, phone: e.target.phone.value});
    e.target.reset();
    render();
});

render()