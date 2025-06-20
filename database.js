// File: database.js

const sqlite3 = require('sqlite3').verbose();

// Path ke file database. './database/resto.db' berarti file akan disimpan
// di dalam folder 'database' dengan nama 'resto.db'.
const DB_PATH = './database/resto.db';

// Membuat koneksi ke database. SQLite akan otomatis membuat file jika belum ada.
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error saat membuka database", err.message);
    } else {
        console.log("Terhubung ke database SQLite.");
        // Jalankan fungsi untuk membuat tabel
        createTables();
    }
});

// Fungsi untuk membuat tabel-tabel yang dibutuhkan
const createTables = () => {
    //
    // Penjelasan Struktur Tabel:
    //
    // 'tables': Menyimpan informasi setiap meja di restoran.
    //   - area: 'regular', 'hotpot', 'vip'
    //   - capacity: Jumlah kursi per meja
    //
    // 'users': Menyimpan data login untuk staf.
    //   - role: 'admin', 'kasir'
    //
    // 'bookings': Menyimpan data booking dari pelanggan.
    //   - status: 'pending_payment', 'confirmed', 'completed', 'cancelled'
    //
    // 'booking_tables': Tabel penghubung antara booking dan meja (jika 1 booking bisa >1 meja).
    //
    // 'menu_items': Daftar semua item menu.
    //   - category: 'appetizer', 'main_course', 'dessert', 'beverage'
    //
    // 'order_items': Detail makanan yang dipesan dalam satu booking.
    //
    const sqlCommands = `
        CREATE TABLE IF NOT EXISTS tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            area TEXT NOT NULL,
            capacity INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            booking_time DATETIME NOT NULL,
            number_of_guests INTEGER NOT NULL,
            status TEXT NOT NULL,
            total_price REAL NOT NULL,
            payment_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS booking_tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            table_id INTEGER,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (table_id) REFERENCES tables(id)
        );

        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            is_available INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER,
            menu_item_id INTEGER,
            quantity INTEGER NOT NULL,
            price_per_item REAL NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
        );
    `;

    db.exec(sqlCommands, (err) => {
        if (err) {
            console.error("Error saat membuat tabel:", err.message);
        } else {
            console.log("Tabel berhasil dibuat atau sudah ada.");
            // Panggil fungsi untuk mengisi data awal (jika perlu)
            seedInitialData();
        }
    });
};

// Fungsi untuk mengisi data awal (meja, user admin, dll)
const seedInitialData = () => {
    db.get("SELECT COUNT(*) as count FROM tables", (err, row) => {
        if (row.count === 0) {
            console.log("Melakukan seeding data awal untuk meja...");
            const stmt = db.prepare("INSERT INTO tables (name, area, capacity) VALUES (?, ?, ?)");
            // 10 meja regular @ 4 kursi
            for (let i = 1; i <= 10; i++) {
                stmt.run(`Regular ${i}`, 'regular', 4);
            }
            // 5 meja hotpot @ 10 kursi (asumsi per meja bisa 10 orang)
            for (let i = 1; i <= 5; i++) {
                stmt.run(`Hotpot ${i}`, 'hotpot', 10);
            }
            // 5 meja VIP @ 6 kursi
            for (let i = 1; i <= 5; i++) {
                stmt.run(`VIP ${i}`, 'vip', 6);
            }
            stmt.finalize();
            console.log("Seeding data meja selesai.");
        }
    });

    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (row.count === 0) {
            console.log("Membuat user admin awal...");
            // PENTING: Di aplikasi nyata, password harus di-hash!
            // Untuk sekarang kita simpan plain text demi kemudahan.
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', 'admin123', 'admin']);
            db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['kasir', 'kasir123', 'kasir']);
            console.log("User admin dan kasir berhasil dibuat.");
        }
    });
};


// Ekspor object database agar bisa digunakan di file lain
module.exports = db;