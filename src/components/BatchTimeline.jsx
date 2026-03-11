import React, { useEffect, useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const Stage = ({ label, active, isLast }) => {
  return (
    <div className="flex-1 flex items-center">
      <div className="flex flex-col items-center">
        <div
          className={
            "w-10 h-10 rounded-full flex items-center justify-center border-2 " +
            (active
              ? "border-green-500 bg-green-500/10 text-green-400"
              : "border-gray-700 bg-gray-800 text-gray-500")
          }
        >
          {active ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
        </div>
        <span className="mt-2 text-xs text-gray-300 text-center">{label}</span>
      </div>
      {!isLast && (
        <div className="flex-1 h-0.5 mx-2">
          <div
            className={
              "h-full w-full " + (active ? "bg-green-500" : "bg-gray-700")
            }
          />
        </div>
      )}
    </div>
  );
};

const BatchTimeline = ({ parentCartonId }) => {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentCartonId) return;
    let mounted = true;
    const fetchBatch = async () => {
      try {
        setLoading(true);
        const ref = doc(db, "batches", parentCartonId);
        const snap = await getDoc(ref);
        if (mounted) {
          if (snap.exists()) {
            setBatch(snap.data());
          } else {
            setBatch(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchBatch();
    return () => {
      mounted = false;
    };
  }, [parentCartonId]);

  const stage1Active = !!(batch && typeof batch.purityScore === "number");
  const stage2Active = !!(batch && batch.blockchainTxHash);
  const stage3Active = !!(batch && batch.status === "In Transit");
  const stage4Active = !!(batch && batch.status === "Sold");

  return (
    <div className="w-full p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">
          Seed Journey Timeline
        </h3>
        {loading && (
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            Updating...
          </span>
        )}
      </div>
      <div className="flex items-center">
        <Stage label="AI Verified" active={stage1Active} />
        <Stage label="Digital Seal" active={stage2Active} />
        <Stage label="In Transit" active={stage3Active} />
        <Stage label="Verified Sold" active={stage4Active} isLast />
      </div>
    </div>
  );
};

export default BatchTimeline;

