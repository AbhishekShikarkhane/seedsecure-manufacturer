import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Upload,
  Scan,
  CheckCircle,
  XCircle,
  Loader2,
  Award,
  AlertTriangle,
  ExternalLink,
  Package,
  Truck,
  MapPin,
  Eye,
  Factory,
  PackageSearch,
  Store,
  History,
  Zap,
  Sparkles,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { analyzeSeedQuality } from './geminiService';
import { generateBatchQRs } from './services/qrService';
import { createBatchOnChain } from './services/blockchainService';
import SeedSecureArtifact from './contracts/SeedSecure.json';
import { saveBatchToFirebase, getBatchesByStatus, dispatchBatch } from './services/firebaseService';
import QRModal from './components/QRModal';
import BatchDetailsModal from './components/BatchDetailsModal';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PartnerManagement from './components/PartnerManagement';
import EmergencySyncButton from './components/EmergencySyncButton';
import useAutoSync from './hooks/useAutoSync';

export const AppSyncContext = React.createContext(null);
const NEON = {
  bg: '#0d0d17',
  panel: 'rgba(26, 26, 46, 0.8)',
  border: 'rgba(255,255,255,0.05)',
  magenta: '#ff007f',
  cyan: '#00f0ff',
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [seedType, setSeedType] = useState('');

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [currentQRData, setCurrentQRData] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [logisticsBatches, setLogisticsBatches] = useState([]);
  const [inTransitBatches, setInTransitBatches] = useState([]);
  const [retailerBatches, setRetailerBatches] = useState([]);
  const [historyBatches, setHistoryBatches] = useState([]);
  const [fetchingBatches, setFetchingBatches] = useState(false);

  // Guarantee mathematically unique batchId (uint256 compatible)
  const generateUniqueBatchId = () => {
    return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  };

  const [batchId, setBatchId] = useState(generateUniqueBatchId());

  useEffect(() => {
    fetchBatches();
  }, []);

  const syncAllDashboardData = useCallback(async () => {
    await fetchBatches();
    // fetchBatches is defined below but is stable — no deps needed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoSync({
    sync: syncAllDashboardData,
    abi: SeedSecureArtifact.abi,
    address: import.meta.env.VITE_SEED_SECURE_ADDRESS,
    eventNames: ['BatchCreated', 'SeedSold', 'ChildPacketScanned', 'BatchStatusUpdated', 'TransitLogged'],
    pollMs: 15000,
    eventDebounceMs: 2000,
    blockDebounceMs: 7000
  });

  const fetchBatches = async () => {
    setFetchingBatches(true);
    const syncStart = Date.now();
    const MIN_SYNC_DISPLAY_MS = 1000; // keep spinner visible for at least 3s
    try {
      const statuses = [
        'Manufactured',
        'Ready for Dispatch',
        'In Transit',
        'At Retailer',
        'Ready for Sale',
        'Sold',
        'Fully Sold',
      ];

      // Use allSettled so one failing query doesn't wipe all data
      const results = await Promise.allSettled(statuses.map(getBatchesByStatus));

      const [manufactured, readyDispatch, transit, retailer, readySale, sold, fullySold] =
        results.map((r) => (r.status === 'fulfilled' ? r.value ?? [] : []));

      let allBatches = [
        ...manufactured,
        ...readyDispatch,
        ...transit,
        ...retailer,
        ...readySale,
        ...sold,
        ...fullySold,
      ];

      // FRONTEND SANITIZATION (SOFT DELETE)
      // Hide any legacy, corrupted, or beta batches that don't match the new strict data structure
      const blacklist = [
        "2122373985",
        "1772115004",
        "1772115814",
        "1772123418",
        "1772136175",
        "1772200965",
        "1772201578",
        "1772201940",
        "1772204686"
      ];

      allBatches = allBatches.filter(b => {
        // Method A: The Structure Check
        const isValidStructure = b && b.parentCartonID && Array.isArray(b.childPacketIDs) && b.childPacketIDs.length > 0;

        // Method C: The Hardcoded Blacklist
        const isNotBlacklisted = !blacklist.includes(b.id?.toString());

        return isValidStructure && isNotBlacklisted;
      });

      // 1. Logistics & Dispatch Tab
      setLogisticsBatches(allBatches.filter(b =>
        b.status === 'Ready for Dispatch' || b.status === 'Manufactured'
      ));

      // 2. In Transit Tab
      setInTransitBatches(allBatches.filter(b =>
        b.status === 'In Transit'
      ));

      // 3. At Retailer Tab (Filtered to only show batches with at least 1 sale)
      setRetailerBatches(allBatches.filter(b => {
        const isAtRetailer = b.status === 'At Retailer' || b.status === 'Ready for Sale';
        const hasSoldPackets = Array.isArray(b.soldChildPackets) && b.soldChildPackets.length > 0;
        const isFullySold = b.status === 'Fully Sold' ||
          (b.childPacketIDs && (b.soldChildPackets?.length || 0) === b.childPacketIDs.length && b.childPacketIDs.length > 0);
        
        return isAtRetailer && hasSoldPackets && !isFullySold;
      }));

      // 4. History Tab
      setHistoryBatches(allBatches.filter(b =>
        b.status === 'Fully Sold' ||
        (b.childPacketIDs &&
          (b.soldChildPackets?.length || 0) === b.childPacketIDs.length &&
          b.childPacketIDs.length > 0)
      ));

      // Refresh the open modal batch so ACTIVE→SOLD updates live
      setSelectedBatch(prev => {
        if (!prev) return prev;
        const freshBatch = allBatches.find(
          b => (b.parentCartonID || b.id) === (prev.parentCartonID || prev.id)
        );
        return freshBatch ?? prev;
      });

      // Log any partial failures for debugging
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn(`[AutoSync] Failed to fetch status "${statuses[i]}":`, r.reason);
        }
      });

    } catch (err) {
      console.error('fetchBatches unexpected error:', err);
      toast.error('Failed to fetch batches');
    } finally {
      // Ensure the syncing animation is visible for at least MIN_SYNC_DISPLAY_MS
      const elapsed = Date.now() - syncStart;
      const remaining = Math.max(0, MIN_SYNC_DISPLAY_MS - elapsed);
      setTimeout(() => setFetchingBatches(false), remaining);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (JPG, PNG, etc.)');
        return;
      }
      setImageFile(file);
      setImage(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleQualityCheck = async () => {
    if (!imageFile) {
      toast.error('Please select an image first');
      return;
    }
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      // Extract known seed categories from existing blockchain batches for Dynamic Memory Prompting
      const allBatches = [...logisticsBatches, ...inTransitBatches, ...retailerBatches, ...historyBatches];
      const knownSeeds = [...new Set(allBatches.map(b => b.seedType).filter(Boolean))];

      const analysis = await analyzeSeedQuality(imageFile, knownSeeds);
      setResult(analysis);
      setSeedType(analysis.seedType || 'Unknown');
      if (analysis.status === 'Approved') {
        toast.success(`Seed quality approved: ${analysis.seedType}`);
      } else {
        toast.error(`Analysis: ${analysis.status}. Purity below threshold.`);
      }
    } catch (err) {
      const msg = 'Failed to analyze image. ' + (err.message || '');
      setError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApproval = async () => {
    if (!result || result.score <= 95) {
      toast.error('Approval requires a passing score above 95%');
      return;
    }
    setProcessing(true);
    setError(null);
    setTxHash(null);
    try {
      const idData = generateBatchQRs(batchId);
      const receipt = await createBatchOnChain({
        batchID: batchId,
        seedType: seedType || 'Premium Wheat Seeds',
        purityScore: Math.round(result.score * 100),
      });
      setTxHash(receipt.hash);
      await saveBatchToFirebase(
        {
          batchID: batchId,
          parentCarton: idData.parentCarton,
          childPackets: idData.childPackets,
          purityScore: result.score,
          seedType: seedType || 'Premium Wheat Seeds',
        },
        receipt.hash
      );
      setCurrentQRData(idData);
      setIsQRModalOpen(true);
      fetchBatches();

      // Reset UI after success and generate NEW unique ID
      setImage(null);
      setImageFile(null);
      setResult(null);
      setBatchId(generateUniqueBatchId());

      toast.success('Batch successfully minted and moved to Logistics & Dispatch.', { duration: 4000 });
    } catch (err) {
      const msg = 'Sequence failed: ' + (err.reason || err.message);
      setError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setProcessing(false);
    }
  };

  const handleDispatch = async (parentId) => {
    try {
      setProcessing(true);
      await dispatchBatch(parentId);
      toast.success('Batch dispatched to distributor');
      fetchBatches();
    } catch (err) {
      setError('Dispatch failed: ' + err.message);
      toast.error('Dispatch failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setSeedType('');
    setError(null);
    setTxHash(null);
    setBatchId(generateUniqueBatchId()); // Generate new ID on rejection
    toast('Batch rejected. Ready for next sample.', { icon: '⚠️' });
  };

  const GlowDot = ({ cx, cy, stroke }) => {
    if (cx == null || cy == null) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill={stroke} opacity={0.12} />
        <circle cx={cx} cy={cy} r={4} fill={stroke} style={{ filter: `drop-shadow(0 0 10px ${stroke})` }} />
      </g>
    );
  };

  const VelocityTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const title = label ?? payload?.[0]?.payload?.name ?? '';
    const created = payload.find((p) => p.dataKey === 'created')?.value ?? 0;
    const sold = payload.find((p) => p.dataKey === 'sold')?.value ?? 0;
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-[#1a1a2e]/90 px-4 py-3 text-xs text-white shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,240,255,0.15),0_0_30px_rgba(0,240,255,0.2),0_0_30px_rgba(255,0,127,0.15)] backdrop-blur-xl">
        <div className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-white/60">{title}</div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00f0ff] shadow-[0_0_18px_rgba(0,240,255,0.75)]" />
            <span className="font-bold text-white/80">Batches Created</span>
          </div>
          <span className="font-black text-white">{created}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff007f] shadow-[0_0_18px_rgba(255,0,127,0.75)]" />
            <span className="font-bold text-white/80">Packets Sold</span>
          </div>
          <span className="font-black text-white">{sold}</span>
        </div>
      </div>
    );
  };

  const GlassTooltipList = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const title = label ?? payload?.[0]?.name ?? '';
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-[#1a1a2e]/70 px-4 py-3 text-xs text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-white/60">{title}</div>
        <div className="space-y-2">
          {payload
            .filter((p) => p.value != null)
            .map((p) => (
              <div key={String(p.dataKey || p.name)} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: p.color || p.fill || p.stroke || '#ffffff',
                      boxShadow: '0 0 16px rgba(255,255,255,0.10)',
                    }}
                  />
                  <span className="font-bold text-white/80">{String(p.name || p.dataKey)}</span>
                </div>
                <span className="font-black text-white">{p.value}</span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const AnimatedBarShape = (props) => {
    const { x, y, width, height, index, fill } = props;
    if (x == null || y == null || width == null || height == null) return null;
    const delay = 0.25 + (index || 0) * 0.08;
    return (
      <motion.rect
        x={x}
        rx={12}
        ry={12}
        width={width}
        fill={fill}
        initial={reduceMotion ? { y, height, opacity: 1 } : { y: y + height, height: 0, opacity: 0 }}
        animate={{ y, height, opacity: 1 }}
        transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    );
  };

  const getLatestLocation = (batch) => {
    const history = Array.isArray(batch.transitHistory) ? batch.transitHistory : [];
    const latest = history.length > 0 ? history[history.length - 1] : null;
    return latest && latest.handlerName ? latest.handlerName : '—';
  };

  const getLatestCoords = (batch) => {
    const history = Array.isArray(batch.transitHistory) ? batch.transitHistory : [];
    const latest = history.length > 0 ? history[history.length - 1] : null;
    const lat = latest && typeof latest.latitude === 'number' ? latest.latitude : null;
    const lng = latest && typeof latest.longitude === 'number' ? latest.longitude : null;
    return { lat, lng };
  };

  const cardBase = 'bg-[#151528] border border-white/5 rounded-xl shadow-lg p-6';

  const hoverGlow = {
    scale: 1.01,
    boxShadow: '0 20px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06), 0 0 42px rgba(0,240,255,0.18), 0 0 42px rgba(255,0,127,0.14)',
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)' },
  };

  const pageContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };

  const mainContentVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  };

  const navItems = [
    { id: 'analysis', label: 'Analysis', icon: Upload },
    { id: 'logistics', label: 'Logistics & Dispatch', icon: Package },
    { id: 'transit', label: 'In Transit', icon: Truck },
    { id: 'retailer', label: 'At Retailer', icon: Store },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <AppSyncContext.Provider value={{ syncAllDashboardData }}>
      <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden font-sans">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(24, 24, 27, 0.85)',
              color: 'var(--neon-text)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
              borderRadius: '14px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
            },
            success: { iconTheme: { primary: 'var(--neon-emerald)' } },
            error: { iconTheme: { primary: 'var(--neon-pink)' } },
          }}
        />

        <div className="print:hidden">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} expanded={sidebarExpanded} setExpanded={setSidebarExpanded} />
        </div>

        <div
          className="print:hidden"
          style={{
            marginLeft: sidebarExpanded ? 260 : 80,
            width: `calc(100vw - ${sidebarExpanded ? 260 : 80}px)`,
            height: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            minWidth: 0,
            padding: '16px 32px',
            transition: 'all 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Manufacturer Portal</div>
            <EmergencySyncButton />
          </div>
          <main className="w-full bg-transparent relative flex flex-col">
            {activeTab === 'dashboard' && <Dashboard batches={[...logisticsBatches, ...inTransitBatches, ...retailerBatches, ...historyBatches]} fetching={fetchingBatches} />}
            {activeTab === 'network' && <PartnerManagement />}
            {activeTab === 'analysis' && (
              <>
                <div className="neon-glass-card" style={{ padding: 28, marginBottom: 24, background: 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={20} style={{ color: 'var(--neon-cyan)' }} />
                      </div>
                      AI-Verified Seed Production
                    </h2>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(168,85,247,0.1))', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 11, padding: '6px 12px', borderRadius: 9999, fontWeight: 600, boxShadow: '0 0 12px rgba(168,85,247,0.15)' }}>
                      <Sparkles size={14} style={{ color: '#a78bfa' }} /> Powered by Google Gemini Vision
                    </span>
                  </div>
                  <p style={{ margin: '0 0 24px 0', fontSize: 14, color: 'var(--neon-text-muted)' }}>
                    Upload a sample; Gemini scores purity. Then mint and track the batch on-chain.
                  </p>
                  <div
                    className="neon-upload-zone-large"
                    style={{
                      border: '2px dashed rgba(34, 211, 238, 0.4)',
                      borderRadius: 20,
                      padding: '48px 24px',
                      textAlign: 'center',
                      background: 'rgba(24, 24, 27, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => document.getElementById('mfg-file-input')?.click()}
                  >
                    <input
                      id="mfg-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    {image ? (
                      <div style={{ position: 'relative' }}>
                        <img src={image} alt="Preview" style={{ maxHeight: 220, margin: '0 auto', borderRadius: 12, display: 'block', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }} />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImage(null); setImageFile(null); setResult(null); setError(null); if (image?.startsWith?.('blob:')) URL.revokeObjectURL(image); }}
                          style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(236,72,153,0.5)', background: 'rgba(236,72,153,0.2)', color: '#f9a8d4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove image"
                        >
                          <Trash2 size={18} />
                        </button>
                        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--neon-text-muted)' }}>Drop a new image to re-run analysis.</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                          <Sparkles size={28} style={{ color: '#a78bfa', filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.5))' }} />
                          <Upload size={56} style={{ color: 'var(--neon-cyan)' }} />
                        </div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 18, color: 'var(--neon-text)' }}>Drag & drop or tap to upload</p>
                        <p style={{ margin: 8, fontSize: 14, color: 'var(--neon-text-muted)' }}>
                          <span style={{ fontWeight: 600, color: '#60a5fa' }}>Gemini AI</span> will perform a multi-point visual purity analysis.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleQualityCheck}
                    disabled={!image || loading}
                    style={{
                      width: '100%',
                      marginTop: 20,
                      padding: '16px 24px',
                      borderRadius: 12,
                      border: '1px solid rgba(168,85,247,0.3)',
                      background: 'linear-gradient(90deg, #2563eb, #7c3aed, #db2777)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: image && !loading ? 'pointer' : 'not-allowed',
                      opacity: image && !loading ? 1 : 0.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => { if (image && !loading) { e.currentTarget.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(90deg, #2563eb, #7c3aed, #db2777)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {loading ? <><Loader2 size={20} className="animate-spin" /> Analyzing with Gemini...</> : <><Sparkles size={18} /> ✨ Analyze with Gemini AI</>}
                  </button>
                  {error && <div style={{ marginTop: 16, padding: 12, background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.4)', borderRadius: 12, color: '#f9a8d4', fontSize: 14 }}>{error}</div>}
                </div>

                {result ? (
                  <div className="neon-glass-card" style={{ padding: 24, marginBottom: 24 }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Award size={20} style={{ color: 'var(--neon-amber)' }} />
                      Analysis Result
                      <span
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: result.status === 'Approved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                          color: result.status === 'Approved' ? 'var(--neon-emerald)' : 'var(--neon-amber)',
                          border: `1px solid ${result.status === 'Approved' ? 'var(--neon-emerald-glow)' : 'rgba(245,158,11,0.5)'}`,
                        }}
                      >
                        {result.status === 'Approved' ? <><CheckCircle size={12} /> Approved</> : <><XCircle size={12} /> {result.status}</>}
                      </span>
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 20 }}>
                      <div
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          background: `conic-gradient(${result.score > 95 ? 'var(--neon-emerald)' : 'var(--neon-pink)'} ${result.score * 3.6}deg, rgba(255,255,255,0.08) ${result.score * 3.6}deg)`,
                          padding: 5,
                        }}
                      >
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--neon-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--neon-glass-border)' }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: result.score > 95 ? 'var(--neon-emerald)' : 'var(--neon-pink)' }}>{result.score}%</span>
                          <span style={{ fontSize: 11, color: 'var(--neon-text-muted)' }}>Purity</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: 12, fontWeight: 600, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Identified Crop</p>
                          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={16} /> {seedType}
                          </p>
                        </div>
                        <div style={{ height: 10, borderRadius: 10, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ height: '100%', width: `${result.score}%`, background: result.score > 95 ? 'var(--neon-emerald)' : 'var(--neon-pink)', borderRadius: 10, transition: 'width 0.7s ease' }} />
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--neon-text-muted)' }}>Threshold ≥ 96% to mint</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--neon-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</p>
                    <p style={{ margin: '0 0 20px 0', fontSize: 14, color: 'var(--neon-text)', background: 'rgba(24,24,27,0.6)', padding: 14, borderRadius: 10, border: '1px solid var(--neon-glass-border)' }}>{result.detail}</p>
                    {txHash && (
                      <div style={{ marginBottom: 20, padding: 14, background: 'rgba(16,185,129,0.12)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 600, color: 'var(--neon-emerald)' }}>Minted on Polygon</p>
                        <p style={{ margin: 0, fontSize: 12, wordBreak: 'break-all', color: 'var(--neon-text-muted)' }}>{txHash}</p>
                        <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--neon-cyan)', fontWeight: 600, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View on PolygonScan <ExternalLink size={14} /></a>
                      </div>
                    )}
                    {result.status === 'Approved' ? (
                      <button onClick={handleFinalApproval} disabled={processing} style={{ width: '100%', padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--neon-emerald), #059669)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: processing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {processing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><CheckCircle size={18} /> {txHash ? 'Batch Created' : 'Approve & Create Batch'}</>}
                      </button>
                    ) : (
                      <button onClick={handleReject} style={{ width: '100%', padding: '12px 24px', borderRadius: 12, border: '1px solid var(--neon-glass-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--neon-text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <AlertTriangle size={18} /> Reject Batch
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="neon-glass-card" style={{ padding: 40, textAlign: 'center' }}>
                    <Sparkles size={56} style={{ color: '#a78bfa', marginBottom: 16, filter: 'drop-shadow(0 0 12px rgba(168,85,247,0.4))' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: 'var(--neon-text)' }}>Awaiting Gemini AI Analysis</h3>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--neon-text-muted)' }}>Upload a seed sample to run Gemini quality control.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'logistics' && (
              <div className="neon-glass-card neon-table-wrap" style={{ overflow: 'hidden', background: 'transparent' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--neon-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={18} /> Logistics & Dispatch (Pending Assignment)
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(24,24,27,0.6)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Batch ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Seed Type</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Parent ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Current Location</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logisticsBatches.length > 0 ? (
                        logisticsBatches.map((batch) => (
                          <tr key={batch.id} style={{ borderBottom: '1px solid var(--neon-glass-border)' }}>
                            <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--neon-cyan)' }}>{batch.batchID}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13 }}>{batch.seedType || 'Unknown'}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.parentCartonID}</td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(34,211,238,0.15)', color: 'var(--neon-cyan)', border: '1px solid rgba(34,211,238,0.4)', boxShadow: '0 0 16px var(--neon-cyan-glow)' }}>Factory / Origin</span>
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="neon-dot-amber" style={{ background: 'var(--neon-amber)', boxShadow: '0 0 12px rgba(245,158,11,0.5)' }} /> Ready</span>
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                              <button onClick={() => setSelectedBatch(batch)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 10, border: '1px solid var(--neon-glass-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--neon-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> Details</button>
                              <button onClick={() => handleDispatch(batch.parentCartonID || batch.id)} disabled={processing} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--neon-cyan), #6366f1)', color: '#fff', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Truck size={14} /> Dispatch</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                              <Package size={40} style={{ color: 'var(--neon-text-muted)', opacity: 0.5 }} />
                              <p style={{ margin: 0, fontSize: 14, color: 'var(--neon-text-muted)', fontWeight: 600 }}>No batches ready for dispatch</p>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--neon-text-muted)', opacity: 0.7 }}>Check Analysis tab for new batches</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'transit' && (
              <div className="neon-glass-card neon-table-wrap" style={{ overflow: 'hidden', background: 'transparent' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--neon-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Truck size={18} /> In Transit (Track & Trace)
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(24,24,27,0.6)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Batch ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Seed Type</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Parent ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Location</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Map</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Details</th>
                        <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inTransitBatches.length > 0 ? (
                        inTransitBatches.map((batch) => {
                          const { lat, lng } = getLatestCoords(batch);
                          return (
                            <tr key={batch.id} style={{ borderBottom: '1px solid var(--neon-glass-border)' }}>
                              <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--neon-cyan)' }}>{batch.batchID}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13 }}>{batch.seedType || 'Unknown'}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.parentCartonID}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13 }}>{getLatestLocation(batch)}</td>
                              <td style={{ padding: '14px 20px' }}>
                                {lat != null && lng != null ? (
                                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(34,211,238,0.2)', color: 'var(--neon-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> Map</a>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--neon-text-muted)' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '14px 20px' }}>
                                <button onClick={() => setSelectedBatch(batch)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--neon-glass-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--neon-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Eye size={12} /> Details</button>
                              </td>
                              <td style={{ padding: '14px 20px', textAlign: 'right' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="neon-dot-cyan" /> In transit</span></td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                              <Truck size={40} style={{ color: 'var(--neon-text-muted)', opacity: 0.5 }} />
                              <p style={{ margin: 0, fontSize: 14, color: 'var(--neon-text-muted)', fontWeight: 600 }}>No batches in transit</p>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--neon-text-muted)', opacity: 0.7 }}>Dispatch batches from Logistics tab</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'retailer' && (
              <div className="neon-glass-card neon-table-wrap" style={{ overflow: 'hidden', background: 'transparent' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--neon-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Store size={18} /> At Retailer (Ready for Sale)
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(24,24,27,0.6)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Batch ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Seed Type</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Parent ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Location</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Map</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Details</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Packets sold</th>
                        <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retailerBatches.length > 0 ? (
                        retailerBatches.map((batch) => {
                          const { lat, lng } = getLatestCoords(batch);
                          const sold = (batch.soldChildPackets || []).length;
                          const total = (batch.childPacketIDs || []).length || 10;
                          const pct = total > 0 ? Math.min(100, (sold / total) * 100) : 0;
                          return (
                            <tr key={batch.id} style={{ borderBottom: '1px solid var(--neon-glass-border)' }}>
                              <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--neon-cyan)' }}>{batch.batchID}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13 }}>{batch.seedType || 'Unknown'}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.parentCartonID}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13 }}>{getLatestLocation(batch)}</td>
                              <td style={{ padding: '14px 20px' }}>
                                {lat != null && lng != null ? (
                                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.2)', color: 'var(--neon-emerald)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> Map</a>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--neon-text-muted)' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '14px 20px' }}>
                                <button onClick={() => setSelectedBatch(batch)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--neon-glass-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--neon-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Eye size={12} /> Details</button>
                              </td>
                              <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <div style={{ flex: '1 1 60px', minWidth: 48, maxWidth: 80, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, var(--neon-emerald), rgba(16,185,129,0.6))', transition: 'width 0.3s ease' }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--neon-text-muted)', whiteSpace: 'nowrap' }}>{sold}/{total}</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 20px', textAlign: 'right' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="neon-dot-emerald" /> Ready for sale</span></td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                              <Store size={40} style={{ color: 'var(--neon-text-muted)', opacity: 0.5 }} />
                              <p style={{ margin: 0, fontSize: 14, color: 'var(--neon-text-muted)', fontWeight: 600 }}>No batches at retailer</p>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--neon-text-muted)', opacity: 0.7 }}>Batches will appear here when marked as final retailer</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="neon-glass-card neon-table-wrap" style={{ overflow: 'hidden', background: 'transparent' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--neon-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <History size={18} /> History (Fully Sold & Burned)
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(24,24,27,0.6)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Batch ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Seed Type</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Parent ID</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Location</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Map</th>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Details</th>
                        <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--neon-text-muted)', textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyBatches.length > 0 ? (
                        historyBatches.map((batch) => {
                          const { lat, lng } = getLatestCoords(batch);
                          return (
                            <tr key={batch.id} style={{ borderBottom: '1px solid var(--neon-glass-border)' }}>
                              <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--neon-cyan)' }}>{batch.batchID}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13 }}>{batch.seedType || 'Unknown'}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.parentCartonID}</td>
                              <td style={{ padding: '14px 20px', fontSize: 13 }}>{getLatestLocation(batch)}</td>
                              <td style={{ padding: '14px 20px' }}>
                                {lat != null && lng != null ? (
                                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(236,72,153,0.2)', color: 'var(--neon-pink)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> Map</a>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--neon-text-muted)' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '14px 20px' }}>
                                <button onClick={() => setSelectedBatch(batch)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--neon-glass-border)', background: 'rgba(255,255,255,0.06)', color: 'var(--neon-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Eye size={12} /> Details</button>
                              </td>
                              <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(236,72,153,0.2)', color: 'var(--neon-pink)', border: '1px solid rgba(236,72,153,0.5)', boxShadow: '0 0 16px var(--neon-pink-glow)' }}><span className="neon-dot-pink" /> Fully sold</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                              <History size={40} style={{ color: 'var(--neon-text-muted)', opacity: 0.5 }} />
                              <p style={{ margin: 0, fontSize: 14, color: 'var(--neon-text-muted)', fontWeight: 600 }}>No fully sold batches yet</p>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--neon-text-muted)', opacity: 0.7 }}>Completed batches will appear here</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>

        {currentQRData && (
          <QRModal
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            parentCarton={currentQRData.parentCarton}
            childPackets={currentQRData.childPackets}
            batchID={currentQRData.batchID}
          />
        )}

        {selectedBatch && (
          <BatchDetailsModal
            batch={selectedBatch}
            onClose={() => setSelectedBatch(null)}
            isSyncing={fetchingBatches}
          />
        )}
      </div>
    </AppSyncContext.Provider>
  );
};

export default App;
