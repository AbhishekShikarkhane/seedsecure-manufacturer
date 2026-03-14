import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Package, Layers } from 'lucide-react';

const QRModal = ({ isOpen, onClose, parentCarton, childPackets, batchID }) => {
  const [activeChildId, setActiveChildId] = useState(null);
  const safeChildPackets = Array.isArray(childPackets) ? childPackets : [];

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return ReactDOM.createPortal(
    <>
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          body > *:not(#qr-print-container) { display: none !important; }
          
          /* Aggressively force white backgrounds and dark text */
          #qr-print-container, 
          #qr-print-container .mfg-modal-overlay,
          #qr-print-container .mfg-modal-dialog,
          #qr-print-container .mfg-modal-header,
          #qr-print-container .mfg-modal-body,
          #qr-print-container .mfg-card {
            background-color: white !important;
          }
          #qr-print-container * {
            color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          #qr-print-container .mfg-card {
            border: 1px solid #ccc !important;
            padding: 8px !important;
            page-break-inside: avoid !important;
          }
          
          /* Force a tight 5-column grid for child packets to fit them all on page 1 */
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 12px !important;
            width: 100% !important;
            margin-top: 10px !important;
          }
          
          /* Scale down parent carton to save vertical space */
          .print-parent {
            padding-bottom: 0 !important;
            border-bottom: 1px solid #ddd !important;
          }
        `}
      </style>
    <div id="qr-print-container" className="mfg-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:static print:block print:bg-transparent print:m-0 print:p-0">
      <div className="mfg-modal-dialog bg-white rounded-xl w-full max-w-md print:bg-white print:text-black print:max-w-none print:w-full print:shadow-none print:border-none print:m-0 print:p-0" style={{ maxWidth: 640 }}>
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
            <div className="mfg-card print-parent" style={{ marginBottom: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={18} style={{ color: 'var(--fb-blue)' }} />
                Parent Carton
              </h3>
              <div style={{ background: '#f7f8fa', padding: 16, borderRadius: 8, marginBottom: 12, display: 'inline-block' }}>
                <QRCodeSVG value={`${import.meta.env.VITE_LOGISTICS_PORTAL_URL}/scan?id=${parentCarton}`} size={180} level="H" includeMargin={true} />
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
              <div className="mfg-qr-children grid grid-cols-2 sm:grid-cols-3 print-grid mt-4">
                {safeChildPackets.map((id, index) => {
                  const isActive = activeChildId === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setActiveChildId(isActive ? null : id)}
                      className="mfg-card print:break-inside-avoid flex flex-col print:flex-col print:items-center print:border print:border-gray-300 print:p-4 print:w-full"
                      style={{ marginBottom: 0, cursor: 'pointer', textAlign: 'center', border: isActive ? '2px solid var(--fb-blue)' : undefined }}
                    >
                      <div style={{ background: '#f7f8fa', padding: 8, borderRadius: 8, marginBottom: 6, width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <QRCodeSVG 
                          value={`${import.meta.env.VITE_FARMER_PORTAL_URL}/verify?id=${id}`} 
                          size={isActive ? 80 : 56} 
                          level="M" 
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                        />
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
                <QRCodeSVG value={`${import.meta.env.VITE_FARMER_PORTAL_URL}/verify?id=${activeChildId}`} size={200} level="H" includeMargin={true} />
              </div>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--fb-text-secondary)', textAlign: 'center' }}>Scan this code with your device.</p>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            button { display: none !important; }
          }
        `}} />
      </div>
    </div>
    </>,
    document.body
  );
};

export default QRModal;
