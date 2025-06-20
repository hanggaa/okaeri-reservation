// File: server.js

const express = require('express');
const cors = require('cors');
const db = require('./database.js'); // Import koneksi database

const app = express();
const PORT = 3000; // Server akan berjalan di port 3000

// Middleware
app.use(cors()); // Mengizinkan request dari domain lain (penting untuk frontend)
app.use(express.json()); // Mem-parsing body request yang berupa JSON

// Menggunakan folder 'public' dan 'admin' untuk file statis
app.use(express.static('public')); // untuk halaman pelanggan
app.use('/admin', express.static('admin')); // untuk halaman admin/kasir

// =================================================================
// ===               BAGIAN BARU: API UNTUK APLIKASI             ===
// =================================================================

// === API UNTUK MANAJEMEN MENU ===

// [GET] Mengambil semua item menu
app.get('/api/menu', (req, res) => {
    const sql = "SELECT * FROM menu_items ORDER BY category, name";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "success", data: rows });
    });
});

// [POST] Menambah item menu baru (Hanya Admin)
// Catatan: Saat ini kita belum implementasi otentikasi, jadi kita asumsikan semua request valid.
app.post('/api/menu', (req, res) => {
    const { name, description, price, category } = req.body;
    if (!name || !price || !category) {
        return res.status(400).json({ error: "Nama, harga, dan kategori wajib diisi." });
    }

    const sql = `INSERT INTO menu_items (name, description, price, category, is_available) VALUES (?, ?, ?, ?, 1)`;
    const params = [name, description, price, category];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: "Item menu berhasil ditambahkan",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// [PUT] Mengubah item menu berdasarkan ID (Hanya Admin)
app.put('/api/menu/:id', (req, res) => {
    const { name, description, price, category, is_available } = req.body;
    const { id } = req.params;

    const sql = `UPDATE menu_items SET 
                    name = COALESCE(?, name), 
                    description = COALESCE(?, description), 
                    price = COALESCE(?, price), 
                    category = COALESCE(?, category),
                    is_available = COALESCE(?, is_available)
                 WHERE id = ?`;
    const params = [name, description, price, category, is_available, id];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Item menu tidak ditemukan." });
        }
        res.json({ message: `Item menu ${id} berhasil diperbarui.`, changes: this.changes });
    });
});

// [DELETE] Menghapus item menu berdasarkan ID (Hanya Admin)
app.delete('/api/menu/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM menu_items WHERE id = ?';

    db.run(sql, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Item menu tidak ditemukan." });
        }
        res.json({ message: `Item menu ${id} berhasil dihapus.`, changes: this.changes });
    });
});


// === API UNTUK KETERSEDIAAN MEJA ===

// [GET] Mengecek meja yang tersedia pada waktu tertentu
app.get('/api/availability', (req, res) => {
    // Klien harus mengirim query parameter `datetime`, contoh: ?datetime=2025-07-20T19:00:00
    const { datetime } = req.query;

    if (!datetime) {
        return res.status(400).json({ error: "Parameter 'datetime' wajib diisi." });
    }

    // Durasi standar booking adalah 2 jam (dalam milidetik)
    // Sesi VIP makan siang/malam juga kita samakan dulu untuk simplifikasi
    const bookingDuration = 2 * 60 * 60 * 1000;
    const requestedTime = new Date(datetime);
    const requestedEndTime = new Date(requestedTime.getTime() + bookingDuration);

    // SQL untuk mencari ID meja yang sudah dibooking pada rentang waktu tersebut
    const sqlBookedTables = `
        SELECT DISTINCT bt.table_id
        FROM bookings b
        JOIN booking_tables bt ON b.id = bt.booking_id
        WHERE
            b.status = 'confirmed' AND
            (
                (b.booking_time >= ? AND b.booking_time < ?) OR
                (STRFTIME('%s', b.booking_time) * 1000 + ? > ? AND b.booking_time < ?)
            )
    `;
    
    // Konversi ke format ISO string yang kompatibel dengan SQLite
    const startTimeStr = requestedTime.toISOString();
    const endTimeStr = requestedEndTime.toISOString();

    const params = [
        startTimeStr,
        endTimeStr,
        bookingDuration,
        requestedTime.getTime(),
        endTimeStr
    ];

    db.all(sqlBookedTables, params, (err, bookedTables) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const bookedTableIds = bookedTables.map(t => t.table_id);
        
        // Ambil SEMUA meja, lalu kita filter di aplikasi
        const sqlAllTables = "SELECT * FROM tables";
        db.all(sqlAllTables, [], (err, allTables) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Tambahkan properti 'is_available'
            const availabilityData = allTables.map(table => ({
                ...table,
                is_available: !bookedTableIds.includes(table.id)
            }));
            
            res.json({
                message: "success",
                query_time: datetime,
                data: availabilityData
            });
        });
    });
});


// === API Test Awal (dari Langkah 1) ===

app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong!' });
});

app.get('/api/tables', (req, res) => {
    const sql = "SELECT * FROM tables ORDER BY area, name";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log('Halaman Pelanggan: http://localhost:3000/');
    console.log('Halaman Admin: http://localhost:3000/admin/');
});