CREATE DATABASE IF NOT EXISTS ta_ecommerce;
USE ta_ecommerce;

CREATE TABLE produk (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  harga INT NOT NULL
);

CREATE TABLE transaksi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produk_id INT,
  status VARCHAR(20) DEFAULT 'PENDING',
  FOREIGN KEY (produk_id) REFERENCES produk(id)
);

INSERT INTO produk (nama, harga) VALUES 
('Flashdisk 32GB', 50000), 
('Mouse Wireless', 75000);

USE ta_ecommerce;

-- Tambah kolom stok
ALTER TABLE produk ADD COLUMN stok INT DEFAULT 10;

-- Update data stok biar gak kosong
UPDATE produk SET stok = 10 WHERE id = 1;
UPDATE produk SET stok = 5 WHERE id = 2;