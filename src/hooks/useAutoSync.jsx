import { useEffect, useRef } from 'react';
import { ethers } from 'ethers';

export default function useAutoSync({
  sync,
  abi,
  address,
  eventNames = ['BatchCreated', 'SeedSold'],
  pollMs = 15000,
  eventDebounceMs = 2000,
}) {
  // Keep a stable ref to the latest sync function so the effect never
  // needs to re-run when the caller re-renders with a new function reference.
  const syncRef = useRef(sync);
  useEffect(() => { syncRef.current = sync; }, [sync]);

  useEffect(() => {
    if (!address || !abi) return;

    let contract;
    let provider;
    let eventTimer;
    let pollTimer;
    let visHandler;

    const runSync = () => syncRef.current?.();

    const setup = async () => {
      if (!window.ethereum) return;

      provider = new ethers.BrowserProvider(window.ethereum);
      contract = new ethers.Contract(address, abi, provider);

      // Debounced trigger: collapses bursts of events into a single sync call.
      const trigger = () => {
        if (eventTimer) clearTimeout(eventTimer);
        eventTimer = setTimeout(() => {
          runSync();
          // Reset polling cadence so we don't double-fire shortly after an event.
          clearInterval(pollTimer);
          pollTimer = setInterval(runSync, pollMs);
        }, eventDebounceMs);
      };

      for (const ev of eventNames) {
        try {
          if (contract.getEvent(ev)) {
            contract.on(ev, trigger);
          }
        } catch {
          // Event may not exist in this contract version — skip silently.
        }
      }

      // Steady-state polling fallback (covers RPCs that don't push events).
      pollTimer = setInterval(runSync, pollMs);

      // Re-sync immediately whenever the tab becomes visible again.
      visHandler = () => {
        if (document.visibilityState === 'visible') {
          runSync();
          clearInterval(pollTimer);
          pollTimer = setInterval(runSync, pollMs);
        }
      };
      document.addEventListener('visibilitychange', visHandler);
    };

    setup();

    return () => {
      if (contract) contract.removeAllListeners();
      if (eventTimer) clearTimeout(eventTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (visHandler) document.removeEventListener('visibilitychange', visHandler);
    };
    // Only re-run if address, abi shape, event list, or timing constants change —
    // NOT when the sync function reference changes (handled by syncRef above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, JSON.stringify(eventNames), pollMs, eventDebounceMs]);
}
