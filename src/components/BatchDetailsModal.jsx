import React, { useState, useRef, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Package, Layers, Loader2, MapPin } from "lucide-react";
import { ethers } from "ethers";
import SeedSecureArtifact from "../contracts/SeedSecure.json";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

// Fix Leaflet's default icon missing issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Plain Leaflet map — avoids react-leaflet's React 19 Context.Consumer incompatibility
const LeafletMap = ({ lat, lng, trackPoints = [], history = [], targetLocation = null }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Use trackPoints center if available, else lat/lng
    const center = trackPoints.length > 0 ? trackPoints[trackPoints.length - 1] : [lat, lng];
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, trackPoints.length > 0 ? 6 : 16);
    mapInstanceRef.current = map;

    // Base Satellite Layer (Google Maps Hybrid for exact match with screenshot)
    L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map);

    // If we have trackPoints (transit route)
    if (trackPoints.length > 0) {
      // Draw Polyline
      if (trackPoints.length > 1) {
        L.polyline(trackPoints, { color: '#3b82f6', weight: 4, dashArray: '5, 10' }).addTo(map);
      }

      // Draw Markers
      history.forEach((event, index) => {
        if (!event.latitude || !event.longitude) return;

        const timestamp = event.timestamp?.toDate
          ? event.timestamp.toDate().toLocaleString()
          : event.timestamp?.seconds
            ? new Date(event.timestamp.seconds * 1000).toLocaleString()
            : new Date(event.timestamp).toLocaleString();

        const marker = L.marker([parseFloat(event.latitude), parseFloat(event.longitude)]).addTo(map);
        marker.bindPopup(`<b>Stop ${index + 1}: ${event.handlerName}</b><br/>${timestamp}`);
      });

      // Auto-fit bounds if multiple points
      if (trackPoints.length > 1) {
        map.fitBounds(L.polyline(trackPoints).getBounds(), { padding: [30, 30] });
      }

    } else {
      // Single location lock fallback (for LocationModal)
      const pulseIcon = L.divIcon({
        className: 'pulse-map-icon',
        html: '<div class="pulse-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, JSON.stringify(trackPoints)]);

  // Handle flyTo when targetLocation changes
  useEffect(() => {
    if (mapInstanceRef.current && targetLocation) {
      const [tLat, tLng] = targetLocation;
      if (!isNaN(tLat) && !isNaN(tLng)) {
        mapInstanceRef.current.flyTo(targetLocation, 14, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      }
    }
  }, [targetLocation]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
};


const LocationModal = ({ childId, onClose }) => {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    const fetchLocation = async () => {
      try {
        const addr = import.meta.env.VITE_SEED_SECURE_ADDRESS;
        const rpcUrl = import.meta.env.VITE_ALCHEMY_RPC_URL || "https://rpc-amoy.polygon.technology";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(addr, SeedSecureArtifact.abi || SeedSecureArtifact, provider);

        const qrHash = ethers.keccak256(ethers.toUtf8Bytes(childId));
        const loc = await contract.packetLocations(qrHash);

        if (!loc || !loc.latitude || !loc.longitude) {
          throw new Error("Location data not provided at time of sale.");
        }
        setCoords({ lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) });
      } catch (err) {
        setError(err.message || "Failed to load location data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLocation();
  }, [childId]);

  return (
    <div className="mfg-modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.85)', animation: 'fadeIn 0.25s ease-out forwards' }}>
      <div className="mfg-modal-dialog" style={{ maxWidth: 500, background: '#161B22', border: '1px solid #1F2937', padding: '0', overflow: 'hidden', animation: 'scaleUp 0.3s ease-out forwards' }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .pulse-map-icon { display: flex; align-items: center; justify-content: center; }
          .pulse-dot { width: 14px; height: 14px; background: #ec4899; border-radius: 50%; position: relative; }
          .pulse-dot::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #ec4899; animation: pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
          @keyframes pulseRing { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
          .skeleton-pulse { animation: skeletonPulse 1.5s ease-in-out infinite; }
          @keyframes skeletonPulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
          @keyframes badgeSold {
            0%   { background-color: #450a0a; box-shadow: 0 0 0px rgba(239,68,68,0); }
            50%  { background-color: #7f1d1d; box-shadow: 0 0 10px rgba(239,68,68,0.65), 0 0 22px rgba(228, 108, 108, 0.25); }
            100% { background-color: #450a0a; box-shadow: 0 0 0px rgba(239,68,68,0); }
          }
          @keyframes badgeActive {
            0%   { background-color: #2b9857ff; box-shadow: 0 0 0px rgba(34,197,94,0); }
            50%  { background-color: #34c772ff; box-shadow: 0 0 10px rgba(34,197,94,0.6), 0 0 20px rgba(23, 219, 95, 0.25); }
            100% { background-color: #2b9857ff; box-shadow: 0 0 0px rgba(34,197,94,0); }
          }
          .badge-sold   { animation: badgeSold   2s ease-in-out infinite; }
          .badge-active { animation: badgeActive 2.5s ease-in-out infinite; }
        `}</style>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1F2937' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: '#ec4899' }} /> Verified Sale Location
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ height: 350, background: '#0D1117', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              <div className="skeleton-pulse" style={{ width: '80%', height: 160, background: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 24 }}></div>
              <Loader2 size={24} className="animate-spin" style={{ marginBottom: 12, color: '#ec4899' }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Resolving Web3 Spatial Lock...</p>
            </div>
          )}
          {error && !loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', padding: 24, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
            </div>
          )}
          {coords && !loading && (
            <LeafletMap lat={coords.lat} lng={coords.lng} />
          )}
        </div>

        {coords && (
          <div style={{ padding: '12px 16px', background: 'rgba(236,72,153,0.1)', borderTop: '1px solid #1F2937', color: '#fbcfe8', fontSize: 12, textAlign: 'center' }}>
            Location permanently locked on blockchain.<br />
            <span style={{ opacity: 0.7 }}>{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const BatchDetailsModal = ({ batch, onClose, isSyncing }) => {
  const [activeMapId, setActiveMapId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [activeTarget, setActiveTarget] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  if (!batch) return null;

  const childIds = Array.isArray(batch.childPacketIDs)
    ? batch.childPacketIDs
    : Array.isArray(batch.childPackets)
      ? batch.childPackets
      : [];
  const soldSet = Array.isArray(batch.soldChildPackets)
    ? new Set(batch.soldChildPackets)
    : new Set();

  const hasChildData = childIds.length > 0;

  const transitHistory = Array.isArray(batch.transitHistory) ? batch.transitHistory : [];

  // Extract coordinates for Polyline
  const coordinatesArray = transitHistory
    .filter(event => event.latitude && event.longitude)
    .map(event => [parseFloat(event.latitude), parseFloat(event.longitude)]);

  const defaultCenter = [28.6139, 77.209];
  const mapCenter = coordinatesArray.length > 0 ? coordinatesArray[coordinatesArray.length - 1] : defaultCenter;

  const formatEventTime = (ts) => {
    if (!ts) return "Unknown time";
    if (ts.toDate) return ts.toDate().toLocaleString(); // Firestore Timestamp
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="mfg-modal-overlay">
      <style>{`
        @keyframes badgeSold {
          0%   { background-color: #351C2A; box-shadow: 0 0 0px rgba(239,68,68,0); }
          50%  { background-color: #5a2f47; box-shadow: 0 0 10px rgba(239,68,68,0.55), 0 0 22px rgba(239,68,68,0.2); }
          100% { background-color: #351C2A; box-shadow: 0 0 0px rgba(239,68,68,0); }
        }
        @keyframes badgeActive {
          0%   { background-color: #444944; box-shadow: 0 0 0px rgba(34,197,94,0); }
          50%  { background-color: #5a6b5a; box-shadow: 0 0 10px rgba(34,197,94,0.5), 0 0 20px rgba(34,197,94,0.2); }
          100% { background-color: #444944; box-shadow: 0 0 0px rgba(34,197,94,0); }
        }
        .badge-sold   { animation: badgeSold   2s ease-in-out infinite; }
        .badge-active { animation: badgeActive 2.5s ease-in-out infinite; }
        @keyframes syncSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <div className="mfg-modal-dialog" style={{ maxWidth: 640 }}>
        <div className="mfg-modal-header">
          <div>
            <h2 className="mfg-modal-title">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--fb-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={20} />
              </div>
              Batch #{batch.batchID}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--fb-text-secondary)' }}>Parent carton and child packet seals.</p>
          </div>
          <button type="button" onClick={onClose} className="mfg-modal-close"><X size={20} /></button>
        </div>

        <div className="mfg-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <div className="mfg-card" style={{ marginBottom: 0, textAlign: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 12 }}>
                <Layers size={16} style={{ verticalAlign: -2, marginRight: 4 }} />
                Parent Carton QR
              </h3>
              {batch.parentCartonID ? (
                <>
                  {/* Parent QR — original size */}
                  <div style={{ background: '#f7f8fa', padding: 16, borderRadius: 8, marginBottom: 12, display: 'inline-block' }}>
                    <QRCodeCanvas value={`${import.meta.env.VITE_LOGISTICS_PORTAL_URL}/scan?id=${batch.parentCartonID}`} size={160} level="H" includeMargin={true} />
                  </div>
                  {/* Compact hash pill */}
                  <div className="w-full max-w-lg mx-auto bg-[#161B22] border border-gray-800 text-gray-400 text-xs font-mono py-2 px-4 rounded-lg truncate text-center shadow-sm">
                    {batch.parentCartonID}
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--fb-text-secondary)' }}>No parent carton ID.</p>
              )}
            </div>


            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 12 }}>
                <Package size={16} style={{ verticalAlign: -2, marginRight: 4 }} /> Child Packet Seals
              </h3>
              {hasChildData ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                  {childIds.map((childId) => {
                    const isSold = soldSet.has(childId);
                    const isHovered = hoveredId === childId;
                    return (
                      <div
                        key={childId}
                        style={{ position: 'relative', textAlign: 'center', marginBottom: 0 }}
                        className="mfg-card"
                        onMouseEnter={() => isSold && setHoveredId(childId)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {isSyncing && !isSold && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(240, 244, 255, 0.88)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            borderRadius: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            border: '1px solid rgba(99, 130, 246, 0.2)',
                            gap: 8,
                          }}>
                            {/* Arc spinner */}
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              border: '2px solid rgba(99, 130, 246, 0.18)',
                              borderTop: '2px solid #6366f1',
                              animation: 'syncSpin 2s linear infinite',
                            }} />
                            <span style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: '#6366f1',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                            }}>Syncing</span>
                          </div>
                        )}

                        {/* QR Code */}
                        <div style={{ background: '#f7f8fa', padding: 8, borderRadius: 8, marginBottom: 6 }}>
                          <QRCodeCanvas value={`${import.meta.env.VITE_FARMER_PORTAL_URL}/verify?id=${childId}`} size={64} level="M" />
                        </div>

                        {/* Hover-only map overlay — only rendered for SOLD, visible only on hover */}
                        {isSold && (
                          <div
                            onClick={() => setActiveMapId(childId)}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: 8,
                              background: 'rgba(13,17,23,0.78)',
                              backdropFilter: 'blur(2px)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10,
                              cursor: 'pointer',
                              opacity: isHovered ? 1 : 0,
                              pointerEvents: isHovered ? 'auto' : 'none',
                              transition: 'opacity 0.22s ease',
                            }}
                          >
                            <div style={{
                              width: 40, height: 40,
                              background: '#10b981',
                              borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 0 15px rgba(16,185,129,0.45)',
                              border: '2px solid #161B22',
                              transform: isHovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
                              transition: 'transform 0.22s ease',
                            }}>
                              <MapPin style={{ width: 18, height: 18, color: '#fff' }} />
                            </div>
                            <span style={{
                              marginTop: 8,
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#ecfdf5',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              background: 'rgba(0,0,0,0.55)',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}>View Map</span>
                          </div>
                        )}

                        {/* Badge — always visible, centered below QR */}
                        <div className="flex justify-center mt-1">
                          {isSold ? (
                            <span className="badge-sold text-red-300 rounded-full px-3 py-1 text-[10px] uppercase tracking-widest shadow-sm">
                              SOLD
                            </span>
                          ) : (
                            <span className="badge-active text-green-300 rounded-full px-3 py-1 text-[10px] uppercase tracking-widest shadow-sm">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mfg-card" style={{ marginBottom: 0, color: 'var(--fb-text-secondary)', fontSize: 14 }}>No child packet data.</div>
              )}
            </div>

            {/* Transit Route Map & Timeline */}
            {(transitHistory.length > 0) && (
              <div className="mfg-card" style={{ marginBottom: 0, marginTop: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text-secondary)', marginBottom: 12 }}>
                  <MapPin size={16} style={{ verticalAlign: -2, marginRight: 4 }} /> Transit Route History
                </h3>

                {/* Route Map (Using stable LeafletMap to avoid React 19 Context crashes) */}
                <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', border: '1px solid #1F2937', marginBottom: 24, position: 'relative' }}>
                  <LeafletMap
                    lat={mapCenter[0]}
                    lng={mapCenter[1]}
                    trackPoints={coordinatesArray}
                    history={transitHistory}
                    targetLocation={activeTarget}
                  />
                </div>

                {/* Vertical Timeline */}
                <div className="mt-4 flex flex-col gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar ml-3">
                  {transitHistory.map((event, index) => (
                    <div key={index} className="relative">
                      <div className="w-3 h-3 bg-blue-500 rounded-full -ml-[7px] mt-4 absolute border-2 border-[#0D1117]"></div>
                      <div className="pl-6">
                        <div
                          className={`flex items-center justify-between p-4 rounded-xl border hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(59,130,246,0.1)] transition-all duration-300 ease-out cursor-pointer group ${activeIndex === index
                              ? 'bg-blue-900/10 border-blue-500/40'
                              : 'bg-[#161B22]/60 border-gray-800/60 hover:border-blue-500/30 hover:bg-[#1C2128]'
                            }`}
                          onClick={() => {
                            setActiveTarget([parseFloat(event.latitude), parseFloat(event.longitude)]);
                            setActiveIndex(index);
                          }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-200 group-hover:text-blue-400 transition-colors">Scanned by {event.handlerName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatEventTime(event.timestamp)}
                            </p>
                          </div>
                          <button
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-sm ${activeIndex === index
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'bg-[#21262D] text-gray-400 group-hover:bg-blue-500/10 group-hover:text-blue-400'
                              }`}
                          >
                            <MapPin size={12} /> Locate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--fb-divider)' }}>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 w-full max-w-sm mx-auto flex justify-center py-3.5 rounded-xl text-sm font-bold text-gray-300 bg-[#21262D] hover:bg-[#30363D] border border-gray-700 hover:text-white transition-all duration-200 shadow-sm active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>

      {activeMapId && (
        <LocationModal childId={activeMapId} onClose={() => setActiveMapId(null)} />
      )}
    </div>
  );
};

export default BatchDetailsModal;

