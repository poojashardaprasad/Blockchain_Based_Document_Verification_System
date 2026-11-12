require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        content.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                const idx = trimmed.indexOf("=");
                const key = trimmed.slice(0, idx).trim();
                const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
                if (key && !(key in process.env)) {
                    process.env[key] = val;
                }
            }
        });
    }
}

// Load blockchain/.env and root .env
loadEnvFile(path.resolve(__dirname, ".env"));
loadEnvFile(path.resolve(__dirname, "../.env"));

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const GANACHE_PRIVATE_KEY = process.env.GANACHE_PRIVATE_KEY;

function isValidPrivateKey(key) {
    if (!key || typeof key !== 'string') return false;
    const clean = key.trim().startsWith("0x") ? key.trim().slice(2) : key.trim();
    return /^[0-9a-fA-F]{64}$/.test(clean);
}

const accounts = isValidPrivateKey(PRIVATE_KEY) 
    ? [PRIVATE_KEY.trim().startsWith("0x") ? PRIVATE_KEY.trim() : `0x${PRIVATE_KEY.trim()}`] 
    : [];

const ganacheAccounts = isValidPrivateKey(GANACHE_PRIVATE_KEY) 
    ? [GANACHE_PRIVATE_KEY.trim().startsWith("0x") ? GANACHE_PRIVATE_KEY.trim() : `0x${GANACHE_PRIVATE_KEY.trim()}`] 
    : undefined;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {},
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337
        },
        ganache: {
            url: process.env.GANACHE_URL || "http://127.0.0.1:7545",
            chainId: 1337,
            accounts: ganacheAccounts
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            chainId: 11155111,
            accounts: accounts
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || ""
    }
};
