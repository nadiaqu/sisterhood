import { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function App() {
  const [produk, setProduk] = useState([]);
  const [transaksi, setTransaksi] = useState([]);
  const [status, setStatus] = useState(null); 
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const resProduk = await axios.get('/api/produk');
      const resTransaksi = await axios.get('/api/transaksi');
      setProduk(resProduk.data);
      setTransaksi(resTransaksi.data);
    } catch (err) {
      console.error("Gagal load data", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Tahap 1: Pesan Barang (Hanya masuk keranjang/tagihan)
  const handleCheckout = async (produk_id) => {
    try {
      const res = await axios.post('/api/checkout', { produk_id });
      setStatus({ type: 'success', text: `🛒 ${res.data.message}` });
      fetchData(); // Refresh UI buat munculin tagihan
    } catch (err) {
      setStatus({ type: 'danger', text: `❌ ${err.response?.data?.message || 'Error'}` });
    }
  };

  // Tahap 2: Bayar Tagihan (Tembak SOAP + Potong Stok)
  const handlePayment = async (tx) => {
    setLoading(true);
    setStatus({ type: 'info', text: '📡 Menghubungkan ke Gateway SOAP Bank...' });

    try {
      const res = await axios.post('/api/payment', { 
        transactionId: tx.transactionId, 
        produk_id: tx.produk_id, 
        harga: tx.harga 
      });
      
      setStatus({ type: 'success', text: `✅ ${res.data.message}` });
      fetchData(); // Refresh stok & status transaksi
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Bank tidak merespons.';
      setStatus({ type: 'danger', text: `⚠️ Error: ${errorMsg}` });
      fetchData(); // Tetap refresh untuk update status FAILED
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-light min-vh-100 pb-5">
      <nav className="navbar navbar-dark bg-primary shadow-sm mb-4">
        <div className="container">
          <span className="navbar-brand fw-bold h1">🛒 Hybrid REST-SOAP E-Commerce</span>
        </div>
      </nav>

      <div className="container">
        {/* Notifikasi Global */}
        {status && (
          <div className={`alert alert-${status.type} shadow-sm border-start border-${status.type} border-4 d-flex align-items-center sticky-top`} style={{top: '10px', zIndex: 1000}}>
            {loading && <div className="spinner-border spinner-border-sm me-3"></div>}
            <strong>{status.text}</strong>
          </div>
        )}

        <div className="row">
          {/* KOLOM KIRI: Katalog */}
          <div className="col-lg-7">
            <h4 className="text-secondary mb-3">1. Pilih Produk</h4>
            <div className="row g-3">
              {produk.map((p) => (
                <div key={p.id} className="col-md-6">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body text-center">
                      <h5 className="fw-bold">{p.nama}</h5>
                      <h5 className="text-primary my-2">Rp {Number(p.harga).toLocaleString('id-ID')}</h5>
                      <p className="text-muted small mb-2">Sisa Stok: <span className="fw-bold text-dark">{p.stok}</span></p>
                      
                      <button 
                        className="btn btn-outline-primary w-100"
                        onClick={() => handleCheckout(p.id)}
                        disabled={p.stok === 0 || loading}
                      >
                        {p.stok === 0 ? 'Habis' : 'Pesan Sekarang'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KOLOM KANAN: Tagihan */}
          <div className="col-lg-5 mt-4 mt-lg-0">
            <h4 className="text-secondary mb-3">2. Tagihan Berjalan</h4>
            <div className="card shadow-sm border-0 bg-white">
              <ul className="list-group list-group-flush">
                {transaksi.length === 0 ? (
                  <li className="list-group-item text-center text-muted py-4">Belum ada pesanan.</li>
                ) : (
                  transaksi.filter(tx => tx.status !== 'PAID').map((tx) => (
                    <li key={tx.transactionId} className="list-group-item d-flex justify-content-between align-items-center py-3">
                      <div>
                        <h6 className="mb-1">{tx.nama}</h6>
                        <small className="text-muted">Rp {Number(tx.harga).toLocaleString('id-ID')}</small>
                        <br/>
                        <span className={`badge ${tx.status === 'PAID' ? 'bg-success' : tx.status === 'FAILED' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {tx.status}
                        </span>
                      </div>
                      
                      {tx.status === 'PENDING' && (
                        <button 
                          className="btn btn-sm btn-success fw-bold"
                          onClick={() => handlePayment(tx)}
                          disabled={loading}
                        >
                          Bayar (SOAP)
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}