const Web3 = require('web3').default || require('web3'); // Common js import issue with Web3 v4
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load Contract ABI
// Assuming the artifact is at ../blockchain/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json
// Since we are in /server/utils, we go ../../blockchain/...
const ARTIFACT_PATH = path.join(__dirname, '../../blockchain/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json');

let web3;
let contract;
let account;

const initBlockchain = async () => {
    if (contract) return { web3, contract, account };

    try {
        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';
        console.log('Web3 Version:', Web3.version);
        console.log('Connecting to RPC:', rpcUrl);
        web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

        const privateKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : null;
        var accountToUse = null; // usage of var to ensure function scope
        if (privateKey) {
            console.log('Private Key Length:', privateKey.length);
            try {
                accountToUse = web3.eth.accounts.privateKeyToAccount(privateKey);
                web3.eth.accounts.wallet.add(accountToUse);
                console.log('Account loaded:', accountToUse.address);
            } catch (accErr) {
                console.error('Error loading account:', accErr);
            }
        } else {
            const accounts = await web3.eth.getAccounts();
            console.log('Ganache Accounts found:', accounts.length);
            accountToUse = { address: accounts[0] };
        }

        if (!fs.existsSync(ARTIFACT_PATH)) {
            console.error('Artifact not found');
            return null;
        }

        if (!fs.existsSync(ARTIFACT_PATH)) {
            throw new Error('Artifact not found at: ' + ARTIFACT_PATH);
        }

        const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));

        let contractAddress = process.env.CONTRACT_ADDRESS ? process.env.CONTRACT_ADDRESS.trim() : null;
        console.log('Account to use:', accountToUse ? accountToUse.address : 'undefined');
        console.log('Contract Address from Env:', contractAddress);

        if (!contractAddress) {
            throw new Error('CONTRACT_ADDRESS not set in .env');
        }

        // Address Normalization
        try {
            if (!web3.utils.isAddress(contractAddress)) {
                console.warn('Initial isAddress check failed. Attempting normalization...');
                contractAddress = web3.utils.toChecksumAddress(contractAddress);
                console.log('Normalized Address:', contractAddress);
            }
        } catch (addrErr) {
            console.error('Address normalization failure:', addrErr.message);
            // Verify explicitly again
            if (!web3.utils.isAddress(contractAddress)) {
                throw new Error('Invalid Ethereum Address: ' + contractAddress);
            }
        }

        contract = new web3.eth.Contract(artifact.abi, contractAddress);
        account = accountToUse;
        console.log('Blockchain Initialized Successfully. Wallet:', account.address);
        return { web3, contract, account };
    } catch (e) {
        console.error('BLOCKCHAIN INIT FATAL ERROR:', e);
        // Throwing here allows the caller to handle it (or crash logs to show it)
        // instead of returning null and causing destructuring error.
        throw e;
    }
};

exports.anchorHash = async (docHash) => {
    const { contract, account, web3 } = await initBlockchain();
    if (!contract) throw new Error('Blockchain not initialized');

    try {
        // Estimate Gas
        const gas = await contract.methods.anchorDocument(docHash).estimateGas({ from: account.address });

        // Send Tx
        const tx = await contract.methods.anchorDocument(docHash).send({
            from: account.address,
            gas: Math.floor(Number(gas) * 1.2) // Convert BigInt to Number before calculation
        });

        return {
            txHash: tx.transactionHash,
            blockNumber: Number(tx.blockNumber) // Convert BigInt to Number
        };
    } catch (error) {
        console.error('Anchor Error:', error);
        throw error;
    }
};

exports.verifyHash = async (docHash) => {
    let blockchainData;
    try {
        blockchainData = await initBlockchain();
    } catch (e) {
        console.error('VerifyHash: Blockchain Init Failed:', e.message);
        throw new Error('Blockchain Service Unavailable');
    }
    const { contract } = blockchainData;

    try {
        const result = await contract.methods.verifyDocument(docHash).call();
        // Returns: [bool, address issuer, uint256 timestamp, uint8 status, string reason]
        // Mapping in Solidity: enum is returned as uint8
        return {
            exists: result[0],
            issuer: result[1],
            timestamp: Number(result[2]), // Convert BigInt to Number
            status: result[3].toString(), // 0=Active, 1=Revoked
            revocationReason: result[4]
        };
    } catch (error) {
        // If not found, it might revert or return false depending on logic.
        // Our contract reverts with "Document not found" if using verifyDocument wrapper?
        // No, docExists check reverts.
        return { exists: false };
    }
};
