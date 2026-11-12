require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.28",
    networks: {
        ganache: {
            url: "http://127.0.0.1:7545",
            // Your private key (with 0x added at the start)
            accounts: ["0x9625f624ac98f5da7cb9432992b469f423eabb1a729775195f129868e37a439d"],
            // This ID helps Hardhat recognize Ganache
            chainId: 1337
        }
    }
};