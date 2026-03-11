/**
 * Generates unique QR codes for a batch, including a parent carton and child packets.
 * 
 * @param {string} batchID - The ID of the batch.
 * @returns {Object} JSON object containing parentCarton UUID and an array of 10 childPacket UUIDs.
 */
export const generateBatchQRs = (batchID) => {
  // Simple random string generator for unique identifiers (UUID-like)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const parentCarton = `BATCH_${batchID}_PARENT_${generateUUID()}`;
  const childPackets = Array.from({ length: 10 }, (_, index) => `BATCH_${batchID}_CHILD_${index + 1}_${generateUUID()}`);

  return {
    batchID,
    parentCarton,
    childPackets
  };
};
