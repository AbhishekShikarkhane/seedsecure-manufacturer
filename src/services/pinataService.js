export const uploadFileToIPFS = async (file) => {
    try {
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

        const data = new FormData();
        data.append('file', file);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`
            },
            body: data
        });

        if (!response.ok) {
            throw new Error(`IPFS Upload failed with status ${response.status}`);
        }

        const resData = await response.json();
        return resData; // Contains IpfsHash, PinSize, Timestamp
    } catch (error) {
        console.error("Error uploading to Pinata:", error);
        throw error;
    }
};

export const uploadJSONToIPFS = async (JSONBody) => {
    try {
        const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`
            },
            body: JSON.stringify(JSONBody)
        });

        if (!response.ok) {
            throw new Error(`IPFS JSON Upload failed with status ${response.status}`);
        }

        const resData = await response.json();
        return resData;
    } catch (error) {
        console.error("Error uploading JSON to Pinata:", error);
        throw error;
    }
};
