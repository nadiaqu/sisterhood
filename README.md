# 🛒 Tugas Akhir Sistem Terdistribusi: Hybrid REST & SOAP

[cite_start]Proyek ini adalah implementasi sistem *e-commerce* sederhana yang mendemonstrasikan interoperabilitas antara sistem modern (REST API/JSON) dan sistem *legacy* (SOAP/XML) dalam satu alur kerja yang terintegrasi[cite: 4, 6, 7].

## 🏗️ Arsitektur Sistem

[cite_start]Sistem ini terdiri dari tiga komponen utama dan satu basis data terpusat[cite: 8, 11]:

* **Frontend (React/Vite):** Antarmuka pengguna untuk menampilkan katalog produk dan keranjang tagihan.
* [cite_start]**Server A - E-Commerce (Express.js):** Bertindak sebagai *backend* utama yang melayani *client* menggunakan REST API (JSON)[cite: 9]. [cite_start]Server ini juga bertugas memetakan dan mentransformasi data JSON menjadi XML.
* [cite_start]**Server B - Payment Gateway (Node.js SOAP):** Menyimulasikan sistem perbankan *legacy* yang menggunakan SOAP RPC (XML) untuk memverifikasi transaksi pembayaran[cite: 10].
* [cite_start]**Database (MySQL):** Menyimpan data produk dan pencatatan transaksi secara *real-time*[cite: 11].

---

## ⚙️ Persyaratan Sistem

Pastikan perangkat lunak berikut telah terinstal:
* [Node.js](https://nodejs.org/) (v18 atau lebih baru)
* [cite_start][MySQL](https://dev.mysql.com/downloads/) (atau XAMPP/MariaDB) [cite: 11]
* Git

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Konfigurasi Database
1. Buka MySQL/phpMyAdmin.
2. Buat *database* baru dengan nama `ta_ecommerce`.
3. Jalankan *script* SQL berikut untuk membuat tabel dan mengisi data awal:

```sql
CREATE TABLE produk (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  harga INT NOT NULL,
  stok INT DEFAULT 10
);

CREATE TABLE transaksi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produk_id INT,
  status VARCHAR(20) DEFAULT 'PENDING',
  FOREIGN KEY (produk_id) REFERENCES produk(id)
);

INSERT INTO produk (nama, harga, stok) VALUES 
('Flashdisk 32GB', 50000, 10), 
('Mouse Wireless', 75000, 5);
