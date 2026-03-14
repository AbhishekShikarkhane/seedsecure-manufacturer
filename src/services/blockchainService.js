import { ethers } from 'ethers';

// ABI extracted from SeedSecure.json
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "batchID",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "seedType",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "purityScore",
        "type": "uint256"
      }
    ],
    "name": "BatchCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "batchID",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "childHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      }
    ],
    "name": "SeedSold",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "batches",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "batchID",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "seedType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "purityScore",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "manufacturer",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "burnedChildPackets",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_batchID",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_seedType",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_purityScore",
        "type": "uint256"
      }
    ],
    "name": "createBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "manufacturer",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_batchID",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "_childHash",
        "type": "bytes32"
      }
    ],
    "name": "verifyAndSell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Get contract address from environment variables
// Ensure VITE_SEED_SECURE_ADDRESS is set in your .env file
const CONTRACT_ADDRESS = import.meta.env.VITE_SEED_SECURE_ADDRESS;

// Debug: print contract address so it can be cross-referenced with the latest deployment
console.log('Contract Address Active:', CONTRACT_ADDRESS);

/**
 * Connects to the SeedSecure contract and creates a new batch.
 * @param {Object} batchData
 * @param {string|number} batchData.batchID - Unique identifier for the batch
 * @param {string} batchData.seedType - Type of seeds (e.g., "Wheat", "Rice")
 * @param {number} batchData.purityScore - Purity score (0-100)
 * @returns {Promise<Object>} - The transaction receipt
 */
export async function createBatchOnChain(batchData) {
  if (!window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured. Set VITE_SEED_SECURE_ADDRESS in .env");
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // 1. Check Network: Ensure user is on Polygon Amoy (80002)
    const network = await provider.getNetwork();
    if (network.chainId !== 80002n) {
      const msg = "Please switch your MetaMask network to Polygon Amoy Testnet (Chain ID 80002).";
      alert(msg);
      throw new Error(msg);
    }

    // 2. Check Contract Code: Ensure address is a contract and not an EOA or empty
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      const msg = `Contract not found at ${CONTRACT_ADDRESS}. Check if the address is correct for the Amoy Testnet.`;
      console.error(msg);
      alert(msg);
      throw new Error(msg);
    }

    // Dynamic Authorization Check: Ensure the current MetaMask account is the manufacturer
    let manufacturer;
    try {
      manufacturer = await contract.manufacturer();
    } catch (decodeErr) {
      console.error("ABI Decoding Error:", decodeErr);
      throw new Error("Failed to communicate with contract. The ABI might not match the deployed contract or you are on the wrong network.");
    }
    
    const currentAccount = await signer.getAddress();
    
    if (currentAccount.toLowerCase() !== manufacturer.toLowerCase()) {
      const errorMsg = `Authorization Failed: Switch to the authorized Manufacturer wallet (${manufacturer}) in MetaMask. Current: ${currentAccount}`;
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const tx = await contract.createBatch(
      batchData.batchID,
      batchData.seedType,
      batchData.purityScore,
      {
        maxPriorityFeePerGas: ethers.parseUnits("35", "gwei"),
        maxFeePerGas: ethers.parseUnits("60", "gwei"),
        gasLimit: 350000
      }
    );

    console.log("Transaction sent:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    return receipt;
  } catch (error) {
    console.error("Blockchain Error Diagnostics:");
    console.error("- Message:", error.message);
    console.error("- Contract:", CONTRACT_ADDRESS);
    console.error("- Chain ID Check: Expected 80002");
    throw error;
  }
}
