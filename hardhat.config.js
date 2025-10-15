require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
module.exports = {
  solidity: {
    compilers: [{ version: "0.8.19" }]
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    hedera_testnet: {
      url: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};