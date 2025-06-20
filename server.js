// File: server.js

const express = require('express');
const cors = require('cors');
const db = require('./database.js'); // Import koneksi database

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// =================================================================
// ===           API ENDPOINTS YANG SUDAH ADA (Langkah 2)        ===
// =================================================================

// [GET] Menu, [POST] Menu, [PUT] Menu, [DELETE] Menu, [GET] Availability, etc.
// ... (Kode API dari langkah sebelumnya tetap di sini) ...
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
app.post('/api/menu', (req, res) => {
    const { name, description, price, category } = req.body;
    if (!name || !price || !category) {
        return res.status(400).json({ error: "Nama, harga, dan kategori wajib diisi." });
    }
    const sql = `INSERT INTO menu_items (name, description, price, category, is_available) VALUES (?, ?, ?, ?, 1)`;
    const params = [name, description, price, category];
    db.run(sql, params, function(err) {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.status(201).json({ message: "Item menu berhasil ditambahkan", data: { id: this.lastID, ...req.body } });
    });
});

// [PUT] Mengubah item menu berdasarkan ID (Hanya Admin)
app.put('/api/menu/:id', (req, res) => {
    const { name, description, price, category, is_available } = req.body;
    const { id } = req.params;
    const sql = `UPDATE menu_items SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), category = COALESCE(?, category), is_available = COALESCE(?, is_available) WHERE id = ?`;
    const params = [name, description, price, category, is_available, id];
    db.run(sql, params, function(err) {
        if (err) { return res.status(500).json({ error: err.message }); }
        if (this.changes === 0) { return res.status(404).json({ error: "Item menu tidak ditemukan." }); }
        res.json({ message: `Item menu ${id} berhasil diperbarui.`, changes: this.changes });
    });
});

// [DELETE] Menghapus item menu berdasarkan ID (Hanya Admin)
app.delete('/api/menu/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM menu_items WHERE id = ?';
    db.run(sql, id, function(err) {
        if (err) { return res.status(500).json({ error: err.message }); }
        if (this.changes === 0) { return res.status(404).json({ error: "Item menu tidak ditemukan." }); }
        res.json({ message: `Item menu ${id} berhasil dihapus.`, changes: this.changes });
    });
});

// [GET] Mengecek meja yang tersedia pada waktu tertentu
app.get('/api/availability', (req, res) => {
    const { datetime } = req.query;
    if (!datetime) { return res.status(400).json({ error: "Parameter 'datetime' wajib diisi." }); }
    const bookingDuration = 2 * 60 * 60 * 1000;
    const requestedTime = new Date(datetime);
    const requestedEndTime = new Date(requestedTime.getTime() + bookingDuration);
    const sqlBookedTables = `SELECT DISTINCT bt.table_id FROM bookings b JOIN booking_tables bt ON b.id = bt.booking_id WHERE b.status = 'confirmed' AND ( (b.booking_time >= ? AND b.booking_time < ?) OR (STRFTIME('%s', b.booking_time) * 1000 + ? > ? AND b.booking_time < ?) )`;
    const startTimeStr = requestedTime.toISOString();
    const endTimeStr = requestedEndTime.toISOString();
    const params = [startTimeStr, endTimeStr, bookingDuration, requestedTime.getTime(), endTimeStr];
    db.all(sqlBookedTables, params, (err, bookedTables) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        const bookedTableIds = bookedTables.map(t => t.table_id);
        const sqlAllTables = "SELECT * FROM tables";
        db.all(sqlAllTables, [], (err, allTables) => {
            if (err) { return res.status(500).json({ error: err.message }); }
            const availabilityData = allTables.map(table => ({ ...table, is_available: !bookedTableIds.includes(table.id) }));
            res.json({ message: "success", query_time: datetime, data: availabilityData });
        });
    });
});


// =================================================================
// ===           BAGIAN BARU: API UNTUK MEMBUAT BOOKING          ===
// =================================================================

// [POST] Membuat booking baru
app.post('/api/bookings', (req, res) => {
    const { customerName, customerPhone, bookingTime, guestCount, tableId, totalPrice, orderItems } = req.body;

    // Validasi input dasar
    if (!customerName || !customerPhone || !bookingTime || !guestCount || !tableId || !orderItems || orderItems.length === 0) {
        return res.status(400).json({ error: "Data tidak lengkap. Semua field wajib diisi." });
    }

    // Menggunakan db.serialize untuk memastikan perintah dieksekusi secara berurutan (transaksi)
    db.serialize(() => {
        // Mulai transaksi
        db.run("BEGIN TRANSACTION;");

        const bookingSql = `INSERT INTO bookings (customer_name, customer_phone, booking_time, number_of_guests, status, total_price) VALUES (?, ?, ?, ?, 'confirmed', ?)`;
        const bookingParams = [customerName, customerPhone, bookingTime, guestCount, totalPrice];
        
        let bookingId;

        db.run(bookingSql, bookingParams, function(err) {
            if (err) {
                console.error("Error di bookingSql:", err.message);
                db.run("ROLLBACK;");
                return res.status(500).json({ error: "Gagal menyimpan data booking." });
            }
            bookingId = this.lastID; // Dapatkan ID dari booking yang baru saja dibuat

            const bookingTableSql = `INSERT INTO booking_tables (booking_id, table_id) VALUES (?, ?)`;
            db.run(bookingTableSql, [bookingId, tableId], (err) => {
                if (err) {
                    console.error("Error di bookingTableSql:", err.message);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: "Gagal menyimpan data meja booking." });
                }

                const orderItemSql = `INSERT INTO order_items (booking_id, menu_item_id, quantity, price_per_item) VALUES (?, ?, ?, ?)`;
                const orderItemStmt = db.prepare(orderItemSql);
                
                let orderItemError = null;
                orderItems.forEach(item => {
                    orderItemStmt.run([bookingId, item.id, item.quantity, item.price], (err) => {
                        if (err) {
                            orderItemError = err;
                        }
                    });
                });
                
                orderItemStmt.finalize((err) => {
                    if (err) orderItemError = err;
                    
                    if (orderItemError) {
                        console.error("Error di orderItemSql:", orderItemError.message);
                        db.run("ROLLBACK;");
                        return res.status(500).json({ error: "Gagal menyimpan item pesanan." });
                    }

                    // Jika semua berhasil, commit transaksi
                    db.run("COMMIT;", (err) => {
                        if (err) {
                            console.error("Error saat COMMIT:", err.message);
                            return res.status(500).json({ error: "Gagal menyelesaikan transaksi." });
                        }
                        res.status(201).json({
                            message: "Booking berhasil dibuat!",
                            bookingId: bookingId
                        });
                    });
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});