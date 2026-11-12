const Web3 = require('web3').default || require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Contract Artifact locations (primary: hardhat build, fallback: server bundled copy)
const HARDHAT_ARTIFACT_PATH = path.join(__dirname, '../../blockchain/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json');
const SERVER_ARTIFACT_PATH = path.join(__dirname, '../contracts/DocumentRegistry.json');

let web3;
let contract;
let account;

const loadArtifact = () => {
    let serverArtifact = null;
    let hardhatArtifact = null;

    if (fs.existsSync(SERVER_ARTIFACT_PATH)) {
        try {
            serverArtifact = JSON.parse(fs.readFileSync(SERVER_ARTIFACT_PATH, 'utf8'));
        } catch (e) {}
    }
    if (fs.existsSync(HARDHAT_ARTIFACT_PATH)) {
        try {
            hardhatArtifact = JSON.parse(fs.readFileSync(HARDHAT_ARTIFACT_PATH, 'utf8'));
        } catch (e) {}
    }

    if (serverArtifact || hardhatArtifact) {
        return {
            ...(hardhatArtifact || {}),
            ...(serverArtifact || {})
        };
    }

    throw new Error(
        'Contract artifact not found! Run "cd blockchain && npx hardhat compile" or ensure server/contracts/DocumentRegistry.json exists.'
    );
};

const initBlockchain = async () => {
    if (contract) return { web3, contract, account };

    try {
        const rpcUrl = (process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545').trim();
        console.log('[BLOCKCHAIN] Connecting to RPC:', rpcUrl);
        web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

        // Standardized key support: PRIVATE_KEY, with SEPOLIA_PRIVATE_KEY and DEPLOYER_PRIVATE_KEY fallbacks
        let rawKey = (process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '').trim();
        var accountToUse = null;

        if (rawKey) {
            if (!rawKey.startsWith('0x')) {
                rawKey = '0x' + rawKey;
            }
            try {
                accountToUse = web3.eth.accounts.privateKeyToAccount(rawKey);
                web3.eth.accounts.wallet.add(accountToUse);
                console.log('[BLOCKCHAIN] Account loaded from private key:', accountToUse.address);
            } catch (accErr) {
                console.error('[BLOCKCHAIN] Error importing private key:', accErr.message);
                throw accErr;
            }
        } else {
            // Ganache / local node accounts fallback
            try {
                const accounts = await web3.eth.getAccounts();
                if (accounts && accounts.length > 0) {
                    console.log('[BLOCKCHAIN] Using default node account:', accounts[0]);
                    accountToUse = { address: accounts[0] };
                }
            } catch (rpcAccErr) {
                console.warn('[BLOCKCHAIN] Could not retrieve node accounts:', rpcAccErr.message);
            }
        }

        const artifact = loadArtifact();

        let contractAddress = (process.env.CONTRACT_ADDRESS || (artifact && artifact.address) || '').trim();
        if (!contractAddress) {
            throw new Error('CONTRACT_ADDRESS not configured in environment variables');
        }

        // Normalize address
        try {
            if (!web3.utils.isAddress(contractAddress)) {
                contractAddress = web3.utils.toChecksumAddress(contractAddress);
            }
        } catch (addrErr) {
            if (!web3.utils.isAddress(contractAddress)) {
                throw new Error('Invalid Ethereum Contract Address: ' + contractAddress);
            }
        }

        contract = new web3.eth.Contract(artifact.abi, contractAddress);
        account = accountToUse;
        console.log('[BLOCKCHAIN] Initialized successfully. Contract:', contractAddress);
        return { web3, contract, account };
    } catch (e) {
        console.error('[BLOCKCHAIN] Init Error:', e.message);
        throw e;
    }
};

exports.anchorHash = async (docHash) => {
    const { contract, account, web3 } = await initBlockchain();
    if (!contract) throw new Error('Blockchain service is unavailable');
    if (!account || !account.address) {
        throw new Error('No funded wallet/account available to anchor document. Check PRIVATE_KEY in .env');
    }

    try {
        // Ensure 0x prefix for bytes32
        const formattedHash = docHash.startsWith('0x') ? docHash : '0x' + docHash;

        // Estimate gas
        const gas = await contract.methods.anchorDocument(formattedHash).estimateGas({ from: account.address });
        
        // Get current gas price for testnet reliability
        let gasPrice;
        try {
            gasPrice = await web3.eth.getGasPrice();
        } catch (gpErr) {
            // fallback
        }

        const txOptions = {
            from: account.address,
            gas: Math.floor(Number(gas) * 1.3)
        };
        if (gasPrice) {
            txOptions.gasPrice = gasPrice;
        }

        const tx = await contract.methods.anchorDocument(formattedHash).send(txOptions);

        return {
            txHash: tx.transactionHash,
            blockNumber: Number(tx.blockNumber)
        };
    } catch (error) {
        console.error('[BLOCKCHAIN] Anchor Error:', error.message);
        throw error;
    }
};

exports.verifyHash = async (docHash) => {
    let blockchainData;
    try {
        blockchainData = await initBlockchain();
    } catch (e) {
        console.error('[BLOCKCHAIN] VerifyHash: Connection error:', e.message);
        throw new Error('Blockchain Service Unavailable');
    }
    const { contract } = blockchainData;

    try {
        const formattedHash = docHash.startsWith('0x') ? docHash : '0x' + docHash;
        const result = await contract.methods.verifyDocument(formattedHash).call();
        // Returns: [bool exists, address issuer, uint256 timestamp, uint8 status, string reason]
        return {
            exists: Boolean(result[0]),
            issuer: result[1],
            timestamp: Number(result[2]),
            status: result[3].toString(), // 0 = Active, 1 = Revoked
            revocationReason: result[4] || ''
        };
    } catch (error) {
        // Contract reverts with "Document not found" if document does not exist
        return { exists: false };
    }
};

exports.revokeHash = async (docHash, reason = 'Revoked by authority') => {
    const { contract, account, web3 } = await initBlockchain();
    if (!contract || !account) throw new Error('Blockchain service not ready');

    const formattedHash = docHash.startsWith('0x') ? docHash : '0x' + docHash;
    const gas = await contract.methods.revokeDocument(formattedHash, reason).estimateGas({ from: account.address });
    const gasPrice = await web3.eth.getGasPrice();

    const tx = await contract.methods.revokeDocument(formattedHash, reason).send({
        from: account.address,
        gas: Math.floor(Number(gas) * 1.3),
        gasPrice: gasPrice
    });

    return {
        txHash: tx.transactionHash,
        blockNumber: Number(tx.blockNumber)
    };
};

