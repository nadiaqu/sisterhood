import { useEffect, useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

export default function App() {
  const [produk, setProduk] = useState([]);
  const [transaksi, setTransaksi] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jsonResponse, setJsonResponse] = useState(null);

  const [qtyPesan, setQtyPesan] = useState({});
  const [rekPesan, setRekPesan] = useState({});

  const fetchData = async () => {
    try {
      const resProduk = await axios.get('/api/produk');
      const resTransaksi = await axios.get('/api/transaksi');
      setProduk(resProduk.data);
      setTransaksi(resTransaksi.data);
    } catch (err) {
      if (!err.response) {
        setStatus({ type: 'danger', text: 'SYSTEM ERROR: BACKEND OFFLINE.' });
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckout = async (produk_id) => {
    const qty = qtyPesan[produk_id] || 1;
    try {
      await axios.post('/api/checkout', { produk_id, qty });
      setQtyPesan(prev => ({ ...prev, [produk_id]: 1 })); 
      fetchData();
    } catch (err) {
      setStatus({ type: 'danger', text: err.response?.data?.message || 'ERROR.' });
    }
  };

  const handlePayment = async (tx) => {
    const rekening = rekPesan[tx.transactionId];
    if (!rekening || rekening.trim() === '') {
      setStatus({ type: 'danger', text: 'INPUT NOMOR REKENING DIBUTUHKAN.' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'dark', text: 'AUTHORIZING PAYMENT...' });

    try {
      const res = await axios.post('/api/payment', {
        transactionId: tx.transactionId,
        produk_id: tx.produk_id,
        harga: tx.harga,
        rekening: rekening
      });
      setStatus(null); 
      setJsonResponse(res.data);
      setRekPesan(prev => ({ ...prev, [tx.transactionId]: '' }));
      fetchData();
    } catch (err) {
      setStatus({ type: 'danger', text: 'PAYMENT DECLINED.' });
      setJsonResponse(err.response?.data || { error: "SYSTEM FAILURE" });
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 pb-5">
      <nav className="navbar navbar-minimal py-3 mb-5">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="fw-bold fs-4 text-uppercase tracking-wide">coffe beans</span>
          <span className="text-label mb-0 fw-bold">tyas-nads-iza</span>
        </div>
      </nav>

      <div className="container">
        
        {status && (
          <div className={`alert border-0 mb-4 text-uppercase fw-bold d-flex align-items-center`} 
               style={{
                 backgroundColor: status.type === 'danger' ? 'var(--status-danger-bg)' : 'var(--brand-accent)', 
                 color: status.type === 'danger' ? 'var(--status-danger-text)' : '#fff'
               }}>
            <div className="me-3">{loading ? '⏳' : status.type === 'danger' ? '⚠️' : '✅'}</div>
            <div className="flex-grow-1">{loading ? 'PROCESSING...' : status.text}</div>
            <button className={`btn-close ${status.type === 'danger' ? '' : 'btn-close-white'}`} onClick={() => setStatus(null)}></button>
          </div>
        )}

        <div className="row g-5">
          <div className="col-lg-7">
            <h5 className="text-uppercase fw-bold mb-4 pb-2 border-bottom">Produk Tersedia</h5>
            
            {produk.length === 0 ? (
              <div className="text-center py-5 border bg-white text-muted">NO DATA AVAILABLE</div>
            ) : (
              <div className="row g-4">
                {produk.map((p) => (
                  <div key={p.id} className="col-md-6">
                    <div className="card-minimal p-4 h-100 d-flex flex-column">
                      <h5 className="fw-bold text-uppercase mb-1">{p.nama}</h5>
                      {/* Harga pakai warna aksen coklat */}
                      <p className="fs-5 mb-4 text-accent fw-bold">Rp {Number(p.harga).toLocaleString('id-ID')}</p>
                      
                      <div className="mt-auto">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="text-label mb-0 fw-bold">Stok: {p.stok}</span>
                          <div style={{width: '60px'}}>
                            <input 
                              type="number" 
                              className="input-minimal text-center p-1" 
                              min="1" 
                              max={p.stok} 
                              value={qtyPesan[p.id] || 1} 
                              onChange={(e) => setQtyPesan({...qtyPesan, [p.id]: parseInt(e.target.value) || 1})}
                              disabled={p.stok === 0}
                            />
                          </div>
                        </div>
                        <button 
                          className="btn-minimal w-100"
                          onClick={() => handleCheckout(p.id)}
                          disabled={p.stok === 0 || loading}
                        >
                          {p.stok === 0 ? 'Out of Stock' : 'Add to Bill'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="col-lg-5">
            <h5 className="text-uppercase fw-bold mb-4 pb-2 border-bottom">Tagihan </h5>
            
            <div className="position-sticky" style={{top: '30px'}}>
              {transaksi.filter(tx => tx.status === 'PENDING').length === 0 ? (
                <div className="p-4 text-center text-label border bg-white">CART IS EMPTY</div>
              ) : (
                transaksi.filter(tx => tx.status === 'PENDING').map((tx) => (
                  <div key={tx.transactionId} className="card-minimal p-4 mb-3">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="fw-bold text-uppercase mb-1">{tx.nama}</h6>
                        <span className="fs-6 fw-bold">Rp {Number(tx.harga).toLocaleString('id-ID')}</span>
                      </div>
                      <span className="badge-minimal badge-warning">PENDING</span>
                    </div>
                    
                    <div className="mt-3 border-top pt-3">
                      <label className="text-label">Nomor Rekening Bank</label>
                      <input 
                        type="text" 
                        className="input-minimal mb-3" 
                        placeholder="000-000-000"
                        value={rekPesan[tx.transactionId] || ''}
                        onChange={(e) => setRekPesan({...rekPesan, [tx.transactionId]: e.target.value})}
                      />
                      <button 
                        className="btn-minimal w-100"
                        onClick={() => handlePayment(tx)}
                        disabled={loading}
                      >
                        Proceed to Payment
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {jsonResponse && (
          <div className="row mt-5">
            <div className="col-12">
              <h6 className="text-label fw-bold border-bottom pb-2 mb-3">System Log / JSON Output</h6>
              <div className="json-console">
                <pre>{JSON.stringify(jsonResponse, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        <div className="row mt-5">
          <div className="col-12">
            <h5 className="text-uppercase fw-bold mb-4 pb-2 border-bottom">Order History</h5>
            <div className="bg-white border">
              <table className="table-minimal">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Produk</th>
                    <th>Harga Total</th>
                    <th className="text-end">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi.filter(tx => tx.status !== 'PENDING').length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4 text-label">NO HISTORY FOUND.</td></tr>
                  ) : (
                    transaksi.filter(tx => tx.status !== 'PENDING').map((tx) => (
                      <tr key={tx.transactionId}>
                        <td className="font-monospace text-muted">INV-{tx.transactionId}</td>
                        <td className="fw-bold text-uppercase">{tx.nama}</td>
                        <td className="fw-bold">Rp {Number(tx.harga).toLocaleString('id-ID')}</td>
                        <td className="text-end">
                          <span className={`badge-minimal ${tx.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                            {tx.status === 'PAID' ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}