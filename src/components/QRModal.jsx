import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Package, Layers } from 'lucide-react';

const QRModal = ({ isOpen, onClose, parentCarton, childPackets, batchID }) => {
  const [activeChildId, setActiveChildId] = useState(null);
  const safeChildPackets = Array.isArray(childPackets) ? childPackets : [];

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mfg-modal-overlay">
      <div className="mfg-modal-dialog" style={{ maxWidth: 640 }}>
        <div className="mfg-modal-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h2 className="mfg-modal-title">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--fb-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={20} />
              </div>
              Batch #{batchID} · Digital Seal
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--fb-text-secondary)' }}>Carton and 10 child packet QR codes.</p>
          </div>
          <button type="button" onClick={onClose} className="mfg-modal-close"><X size={20} /></button>
        </div>

        <div className="mfg-modal-body" style={{ padding: 20 }}>
          <div className="mfg-modal-grid">
            <div className="mfg-card" style={{ marginBottom: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={18} style={{ color: 'var(--fb-blue)' }} />
                Parent Carton
              </h3>
              <div style={{ background: '#f7f8fa', padding: 16, borderRadius: 8, marginBottom: 12, display: 'inline-block' }}>
                <QRCodeSVG value={`https://seedsecure-farmer-426y8cny5-abhisheks-projects-7717ae06.vercel.app/scan?id=${parentCarton}`} size={180} level="H" includeMargin={true} />
              </div>
              <code style={{ fontSize: 11, wordBreak: 'break-all', display: 'block', textAlign: 'center', padding: '8px 12px', background: '#f7f8fa', borderRadius: 8, fontFamily: 'ui-monospace, monospace' }}>
                {parentCarton}
              </code>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={18} style={{ color: 'var(--fb-blue)' }} />
                Child Packets ({safeChildPackets.length})
              </h3>
              <div className="mfg-qr-children">
                {safeChildPackets.map((id, index) => {
                  const isActive = activeChildId === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setActiveChildId(isActive ? null : id)}
                      className="mfg-card"
                      style={{ marginBottom: 0, cursor: 'pointer', textAlign: 'center', border: isActive ? '2px solid var(--fb-blue)' : undefined }}
                    >
                      <div style={{ background: '#f7f8fa', padding: 8, borderRadius: 8, marginBottom: 6 }}>
                        <QRCodeSVG value={`https://seedsecure-farmer-426y8cny5-abhisheks-projects-7717ae06.vercel.app/verify?id=${id}`} size={isActive ? 80 : 56} level="M" />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fb-text-secondary)' }}>#{index + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--fb-divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={onClose} className="mfg-btn-secondary">Close</button>
          <button type="button" onClick={handlePrint} className="mfg-btn-primary"><Printer size={18} /> Print Labels</button>
        </div>

        {activeChildId && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <div className="mfg-card" style={{ maxWidth: 400, margin: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--fb-text-secondary)' }}>Child Packet #{safeChildPackets.indexOf(activeChildId) + 1} of {safeChildPackets.length}</p>
                </div>
                <button type="button" onClick={() => setActiveChildId(null)} className="mfg-modal-close"><X size={18} /></button>
              </div>
              <div style={{ background: '#f7f8fa', padding: 20, borderRadius: 8, display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG value={`https://seedsecure-farmer-426y8cny5-abhisheks-projects-7717ae06.vercel.app/verify?id=${activeChildId}`} size={200} level="H" includeMargin={true} />
              </div>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--fb-text-secondary)', textAlign: 'center' }}>Scan this code with your device.</p>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            .mfg-modal-dialog, .mfg-modal-dialog * { visibility: visible; }
            .mfg-modal-overlay { position: static !important; background: white !important; }
            button { display: none !important; }
          }
        `}} />
      </div>
    </div>
  );
};

export default QRModal;
