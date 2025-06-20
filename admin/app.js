// File: admin/app.js

const API_BASE_URL = 'http://localhost:3000/api';

// Element selectors
const menuTableBody = document.getElementById('menu-table-body');
const menuForm = document.getElementById('menu-form');
const formTitle = document.getElementById('form-title');
const menuItemId = document.getElementById('menu-item-id');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Fungsi untuk mengambil dan menampilkan semua item menu
const fetchMenuItems = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/menu`);
        const result = await response.json();
        
        menuTableBody.innerHTML = ''; // Kosongkan tabel sebelum diisi

        if (result.data) {
            result.data.forEach(item => {
                const tr = document.createElement('tr');

                const availabilityStatus = item.is_available 
                    ? '<span class="status-available">Tersedia</span>' 
                    : '<span class="status-unavailable">Habis</span>';
                
                tr.innerHTML = `
                    <td>${item.name}</td>
                    <td>Rp ${new Intl.NumberFormat('id-ID').format(item.price)}</td>
                    <td>${item.category}</td>
                    <td>${availabilityStatus}</td>
                    <td>
                        <button class="btn btn-edit" onclick='handleEdit(${JSON.stringify(item)})'>Edit</button>
                        <button class="btn btn-delete" onclick="handleDelete(${item.id})">Hapus</button>
                    </td>
                `;
                menuTableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error fetching menu items:', error);
        alert('Gagal memuat data menu.');
    }
};

// Fungsi untuk menangani submit form (tambah atau edit)
menuForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = menuItemId.value;
    const isEditing = !!id;

    const formData = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value),
        category: document.getElementById('category').value,
        is_available: parseInt(document.getElementById('is_available').value)
    };

    const url = isEditing ? `${API_BASE_URL}/menu/${id}` : `${API_BASE_URL}/menu`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert(`Item menu berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}!`);
        resetForm();
        fetchMenuItems(); // Refresh tabel

    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Gagal menyimpan data.');
    }
});

// Fungsi untuk mengisi form saat tombol "Edit" diklik
const handleEdit = (item) => {
    formTitle.textContent = 'Edit Item Menu';
    menuItemId.value = item.id;
    document.getElementById('name').value = item.name;
    document.getElementById('description').value = item.description;
    document.getElementById('price').value = item.price;
    document.getElementById('category').value = item.category;
    document.getElementById('is_available').value = item.is_available;
    
    cancelEditBtn.style.display = 'inline-block';
    window.scrollTo(0, 0); // Scroll ke atas halaman
};

// Fungsi untuk menghapus item menu
const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            alert('Item menu berhasil dihapus.');
            fetchMenuItems(); // Refresh tabel

        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Gagal menghapus item.');
        }
    }
};

// Fungsi untuk mereset form
const resetForm = () => {
    menuForm.reset();
    menuItemId.value = '';
    formTitle.textContent = 'Tambah Item Menu Baru';
    cancelEditBtn.style.display = 'none';
};

// Event listener untuk tombol "Batal"
cancelEditBtn.addEventListener('click', resetForm);

// Panggil fungsi fetchMenuItems saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', fetchMenuItems);