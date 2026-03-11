import React, { useState, useContext } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppSyncContext } from '../App';

export default function GlobalSyncButton() {
  const { syncAllDashboardData } = useContext(AppSyncContext) || {};
  const [isSyncing, setIsSyncing] = useState(false);

  const onClick = async () => {
    if (!syncAllDashboardData || isSyncing) return; // guard against double-click
    setIsSyncing(true);
    try {
      await syncAllDashboardData();
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isSyncing}
      aria-label="Global Sync"
      title={isSyncing ? 'Syncing…' : 'Sync dashboard'}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '10px',
        borderRadius: 9999,
        cursor: isSyncing ? 'not-allowed' : 'pointer',
        opacity: isSyncing ? 0.5 : 1,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => { if (!isSyncing) e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,157,0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} color="#00FF9D" />
    </button>
  );
}
