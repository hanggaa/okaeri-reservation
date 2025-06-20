// File: public/order.js

const API_BASE_URL = 'http://localhost:3000/api';
let menuItems = [];
let cart = [];
let bookingDetails = {};

// Element Selectors
const bookingSummaryText = document.getElementById('booking-summary-text');
const menuItemsContainer = document.getElementById('menu-items-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPriceEl = document.getElementById('cart-total-price');
const finalizeBtn = document.getElementById('finalize-booking-btn');
const modal = document.getElementById('customer-details-modal');
const closeModalBtn = document.querySelector('.close-modal');
const customerForm = document.getElementById('customer-form');

// Fungsi untuk memformat mata uang
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

// Muat data saat halaman dibuka
document.addEventListener('DOMContentLoaded', () => {
    const details = sessionStorage.getItem('bookingDetails');
    if (!details) {
        alert("Detail booking tidak ditemukan, silahkan ulangi dari awal.");
        window.location.href = 'index.html';
        return;
    }
    bookingDetails = JSON.parse(details);
    displayBookingSummary();
    fetchMenu();
});

// Tampilkan ringkasan booking
const displayBookingSummary = () => {
    const { date, time, guestCount } = bookingDetails;
    bookingSummaryText.innerHTML = `
        Tanggal: <strong>${date}</strong><br>
        Jam: <strong>${time}</strong><br>
        Jumlah Tamu: <strong>${guestCount} orang</strong>
    `;
};

// Ambil data menu dari API
const fetchMenu = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu`);
        const result = await response.json();
        menuItems = result.data.filter(item => item.is_available); // Hanya tampilkan menu yang tersedia
        renderMenu();
    } catch (error) {
        console.error("Gagal memuat menu:", error);
    }
};

// Render menu ke halaman
const renderMenu = () => {
    menuItemsContainer.innerHTML = '';
    const menuByCategory = menuItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    for (const category in menuByCategory) {
        const categorySection = document.createElement('div');
        categorySection.className = 'menu-category';
        categorySection.innerHTML = `<h4>${category.replace('_', ' ')}</h4>`;
        
        menuByCategory[category].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            itemDiv.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${formatCurrency(item.price)}</span>
                </div>
                <button class="add-to-cart-btn" data-id="${item.id}">Tambah</button>
            `;
            categorySection.appendChild(itemDiv);
        });
        menuItemsContainer.appendChild(categorySection);
    }
};

// Event listener untuk tombol "Tambah"
menuItemsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const itemId = parseInt(e.target.dataset.id);
        addToCart(itemId);
    }
});

// Tambah item ke keranjang
const addToCart = (itemId) => {
    const existingItem = cart.find(item => item.id === itemId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        const itemToAdd = menuItems.find(item => item.id === itemId);
        cart.push({ ...itemToAdd, quantity: 1 });
    }
    renderCart();
};

// Render keranjang belanja
const renderCart = () => {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-text">Keranjang masih kosong.</p>';
        finalizeBtn.disabled = true;
    } else {
        cartItemsContainer.innerHTML = '';
        cart.forEach(item => {
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.innerHTML = `
                <span class="item-name">${item.name} (x${item.quantity})</span>
                <span class="item-price">${formatCurrency(item.price * item.quantity)}</span>
            `;
            cartItemsContainer.appendChild(cartItemDiv);
        });
        finalizeBtn.disabled = false;
    }
    updateCartTotal();
};

// Update total harga
const updateCartTotal = () => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalPriceEl.textContent = formatCurrency(total);
};

// Event listeners untuk Modal
finalizeBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle submit form data diri dan buat booking
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;

    const finalBookingData = {
        customerName,
        customerPhone,
        bookingTime: `${bookingDetails.date}T${bookingDetails.time}:00`,
        guestCount: parseInt(bookingDetails.guestCount),
        tableId: parseInt(bookingDetails.tableId),
        totalPrice: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        orderItems: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price }))
    };

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBookingData)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Gagal membuat booking.');
        }
        
        alert(`Booking berhasil! ID Booking Anda: ${result.bookingId}`);
        sessionStorage.removeItem('bookingDetails');
        window.location.href = 'index.html'; // Kembali ke halaman utama

    } catch (error) {
        console.error("Error finalisasi booking:", error);
        alert(error.message);
    }
});