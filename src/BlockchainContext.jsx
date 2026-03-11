import React, { createContext, useContext, useState } from 'react';

const BlockchainContext = createContext(null);

export const useBlockchain = () => useContext(BlockchainContext);

export const BlockchainProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);

    const value = {
        connected,
        setConnected,
    };

    return (
        <BlockchainContext.Provider value={value}>
            {children}
        </BlockchainContext.Provider>
    );
};

export default BlockchainContext;
