const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
app.use(express.json());

const dbConfig = { host: 'localhost', user: 'root', password: '', database: 'ta_ecommerce' };

// 1. Ambil Data Produk
app.get('/api/produk', async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.query('SELECT * FROM produk');
  res.json(rows);
});

// 2. Ambil Tagihan Transaksi
app.get('/api/transaksi', async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  // TRIK UI: Kita gabungkan nama produk dengan qty-nya agar frontend tidak perlu diubah.
  // Harga juga langsung dikalikan qty agar totalnya sesuai.
  const [rows] = await db.query(`
    SELECT 
      t.id as transactionId, 
      t.status, 
      CONCAT(p.nama, ' (x', t.qty, ')') as nama, 
      (p.harga * t.qty) as harga, 
      p.id as produk_id 
    FROM transaksi t 
    JOIN produk p ON t.produk_id = p.id 
    ORDER BY t.id DESC
  `);
  res.json(rows);
});

// 3. Checkout (Tambah ke Tagihan)
app.post('/api/checkout', async (req, res) => {
  const { produk_id, qty = 1 } = req.body; // Tangkap qty dari frontend
  const db = await mysql.createConnection(dbConfig);

  try {
    const [produk] = await db.query('SELECT stok FROM produk WHERE id = ?', [produk_id]);
    
    // Validasi apakah stok mencukupi dengan qty yang dibeli
    if (produk.length === 0 || produk[0].stok < qty) {
      return res.status(400).json({ message: `Stok tidak cukup! Sisa stok hanya ${produk.length > 0 ? produk[0].stok : 0}` });
    }

    // Simpan data transaksi beserta qty-nya
    await db.query("INSERT INTO transaksi (produk_id, qty, status) VALUES (?, ?, 'PENDING')", [produk_id, qty]);
    res.json({ message: `Berhasil menambahkan ${qty} pesanan!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal membuat pesanan." });
  }
});

// 4. Pembayaran (Integrasi SOAP Bank)
app.post('/api/payment', async (req, res) => {
  const { transactionId, produk_id, harga } = req.body;
  const db = await mysql.createConnection(dbConfig);


  console.log("\n[REST] Request pembayaran dari client:", { transactionId, produk_id, harga });

  try {
    const builder = new xml2js.Builder({ renderOpts: { pretty: true } });
    
    const strukturData = {
      'soap:Envelope': {
        '$': { 
          'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
          'xmlns:pay': 'http://payment.gateway/service'
        },
        'soap:Body': {
          'pay:processPayment': {
            'transactionId': transactionId,
            'amount': harga // Mengirimkan harga total yang sudah dikali qty
          }
        }
      }
    };

    const soapEnvelope = builder.buildObject(strukturData);
    console.log("[REST] Mengirim XML ke SOAP Server...");

    const response = await axios.post('http://localhost:8000/payment', soapEnvelope, {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 3000
    });

    const parsed = await xml2js.parseStringPromise(response.data, { 
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix]
    });
    
    const soapResult = parsed.Envelope.Body.processPaymentResponse.status;
    console.log(`[REST] Status respons SOAP: ${soapResult}`);

    if(soapResult === 'SUCCESS') {
      // Ambil nilai qty dari database untuk memotong stok produk secara akurat
      const [txData] = await db.query("SELECT qty FROM transaksi WHERE id = ?", [transactionId]);
      const qtyBeli = txData.length > 0 ? txData[0].qty : 1;

      await db.query("UPDATE transaksi SET status = 'PAID' WHERE id = ?", [transactionId]);
      await db.query("UPDATE produk SET stok = stok - ? WHERE id = ?", [qtyBeli, produk_id]); // Stok dipotong sebesar qtyBeli
      
      res.json({ message: "Pembayaran Sukses! Pesanan diterima." });
    } else {
      await db.query("UPDATE transaksi SET status = 'FAILED' WHERE id = ?", [transactionId]);
      res.status(400).json({ message: "Pembayaran Ditolak oleh Bank." });
    }
  } catch (error) {
    console.error("\n[ERROR] Server Bank (SOAP) Tidak Merespons.");
    res.status(500).json({ message: "Server Bank Tidak Merespons / Terputus." });
  }
});

app.listen(5000, () => console.log('Server REST berjalan di port 5000'));