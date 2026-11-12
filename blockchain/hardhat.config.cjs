require("@nomicfoundation/hardhat-toolbox");
try {
    require("dotenv").config();
} catch (e) {}

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const GANACHE_PRIVATE_KEY = process.env.GANACHE_PRIVATE_KEY;

const accounts = PRIVATE_KEY ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`] : [];
const ganacheAccounts = GANACHE_PRIVATE_KEY 
    ? [GANACHE_PRIVATE_KEY.startsWith("0x") ? GANACHE_PRIVATE_KEY : `0x${GANACHE_PRIVATE_KEY}`] 
    : (accounts.length > 0 ? accounts : undefined);

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
