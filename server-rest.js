const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');

const app = express();
app.use(express.json());

const dbConfig = { host: 'localhost', user: 'root', password: '', database: 'ta_ecommerce' };

app.get('/api/produk', async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.query('SELECT * FROM produk');
  res.json(rows);
});

app.get('/api/transaksi', async (req, res) => {
  const db = await mysql.createConnection(dbConfig);
  const [rows] = await db.query(`
    SELECT t.id as transactionId, t.status, p.nama, p.harga, p.id as produk_id 
    FROM transaksi t JOIN produk p ON t.produk_id = p.id 
    ORDER BY t.id DESC
  `);
  res.json(rows);
});

app.post('/api/checkout', async (req, res) => {
  const { produk_id } = req.body;
  const db = await mysql.createConnection(dbConfig);

  try {
    const [produk] = await db.query('SELECT stok FROM produk WHERE id = ?', [produk_id]);
    if (produk.length === 0 || produk[0].stok <= 0) {
      return res.status(400).json({ message: "Gagal: Stok barang sudah habis!" });
    }

    await db.query("INSERT INTO transaksi (produk_id, status) VALUES (?, 'PENDING')", [produk_id]);
    res.json({ message: "Checkout berhasil. Silakan lakukan pembayaran!" });
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat pesanan." });
  }
});

app.post('/api/payment', async (req, res) => {
  const { transactionId, produk_id, harga } = req.body;
  const db = await mysql.createConnection(dbConfig);

  console.log("request dari web client:");
  console.log({ transactionId, produk_id, harga });

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
            'amount': harga
          }
        }
      }
    };


    const soapEnvelope = builder.buildObject(strukturData);

    
    console.log("\njson to xml soap:");
    console.log(soapEnvelope);


    const response = await axios.post('http://localhost:8000/payment', soapEnvelope, {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 3000
    });

    console.log("\nresponse xml soap");
    console.log(response.data);

    const parsed = await xml2js.parseStringPromise(response.data, { 
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix]
    });
    
    const soapResult = parsed.Envelope.Body.processPaymentResponse.status;
    
    console.log(`\nxml to json status: ${soapResult}`);

    if(soapResult === 'SUCCESS') {
      await db.query("UPDATE transaksi SET status = 'PAID' WHERE id = ?", [transactionId]);
      await db.query("UPDATE produk SET stok = stok - 1 WHERE id = ?", [produk_id]);
      res.json({ message: "Pembayaran Sukses! Pesanan diterima." });
    } else {
      await db.query("UPDATE transaksi SET status = 'FAILED' WHERE id = ?", [transactionId]);
      res.status(400).json({ message: "Pembayaran Ditolak oleh Bank." });
    }
  } catch (error) {
    console.error("\n[ERROR] Server Bank Tidak Merespons / Mati.");
    res.status(500).json({ message: "Server Bank Tidak Merespons / Mati." });
  }
});
app.listen(5000, () => console.log('Server A jalan di port 5000'));