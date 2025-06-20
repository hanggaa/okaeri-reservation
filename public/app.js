// File: public/app.js

const API_BASE_URL = 'http://localhost:3000/api';

const availabilityForm = document.getElementById('availability-form');
const tableLayoutContainer = document.getElementById('table-layout-container');
const tableLayout = document.getElementById('table-layout');

// Set default date and time to today
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    // Format to YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('booking-date').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('booking-date').min = `${yyyy}-${mm}-${dd}`;
    
    // Set default time to nearest 30 mins
    let hours = today.getHours();
    let minutes = today.getMinutes();
    if (minutes < 30) {
        minutes = 30;
    } else {
        minutes = 0;
        hours = (hours + 1) % 24;
    }
    const hh = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    document.getElementById('booking-time').value = `${hh}:${min}`;
});

// Handle form submission
availabilityForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    const guestCount = parseInt(document.getElementById('guest-count').value);

    // Gabungkan tanggal dan waktu menjadi format ISO
    const datetime = `${date}T${time}:00`;

    try {
        const response = await fetch(`${API_BASE_URL}/availability?datetime=${datetime}`);
        if (!response.ok) {
            throw new Error('Gagal mengambil data ketersediaan.');
        }
        const result = await response.json();
        
        renderTableLayout(result.data, guestCount);
        tableLayoutContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
});

// Fungsi untuk merender denah meja
const renderTableLayout = (tables, guestCount) => {
    tableLayout.innerHTML = ''; // Kosongkan layout

    // Kelompokkan meja berdasarkan area
    const tablesByArea = tables.reduce((acc, table) => {
        if (!acc[table.area]) {
            acc[table.area] = [];
        }
        acc[table.area].push(table);
        return acc;
    }, {});

    // Render setiap area
    for (const area in tablesByArea) {
        const areaSection = document.createElement('div');
        areaSection.className = 'area-section';

        const areaTitle = document.createElement('h4');
        areaTitle.className = 'area-title';
        areaTitle.textContent = area;
        areaSection.appendChild(areaTitle);
        
        const tableGrid = document.createElement('div');
        tableGrid.className = 'table-grid';

        tablesByArea[area].forEach(table => {
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table';
            
            // Tentukan status meja
            if (!table.is_available) {
                tableDiv.classList.add('unavailable');
            } else if (table.capacity < guestCount) {
                tableDiv.classList.add('too-small');
            } else {
                tableDiv.classList.add('available');
                // Tambahkan event listener hanya untuk meja yang tersedia
                tableDiv.addEventListener('click', () => {
                    handleTableSelection(table.id);
                });
            }

            tableDiv.innerHTML = `
                <div class="table-name">${table.name}</div>
                <div class="table-capacity">Kapasitas: ${table.capacity}</div>
            `;

            tableGrid.appendChild(tableDiv);
        });
        
        areaSection.appendChild(tableGrid);
        tableLayout.appendChild(areaSection);
    }
};

// Fungsi untuk menangani saat meja dipilih
const handleTableSelection = (tableId) => {
    // Di langkah selanjutnya, kita akan proses booking dari sini
    alert(`Anda memilih meja dengan ID: ${tableId}. Langkah selanjutnya adalah memilih menu.`);
    // Contoh: window.location.href = `/menu-selection.html?table_id=${tableId}`;
};