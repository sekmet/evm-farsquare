/**
 * Keeper script: naive matcher picks first compatible taker for a maker order and submits on-chain fill.
 * Production: use robust matching, concurrency, retries, gas optimization, reputation & security controls.
 */
import axios from "axios";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const RPC = process.env.RPC || "http://localhost:8545";
const PRIVATE_KEY = process.env.KEEPPER_PRIVATE_KEY || "";
const ORDERBOOK_CONTRACT = process.env.ORDERBOOK_CONTRACT || "";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const orderbookAbi = [
    "function fillOrder((address,address,address,uint256,uint256,uint256,uint256), bytes) external"
  ];
  const orderbook = new ethers.Contract(ORDERBOOK_CONTRACT, orderbookAbi, wallet);

  // fetch orders
  const resp = await axios.get("http://localhost:3001/orders");
  const orders = resp.data;
  if (!orders || orders.length === 0) {
    console.log("no orders");
    return;
  }
  const order = orders[0];
  // naive: we act as taker (should be funded & approved)
  const orderStruct = {
    maker: order.maker,
    tokenIn: order.tokenIn,
    tokenOut: order.tokenOut,
    amountIn: ethers.parseUnits(order.amountIn, 18),
    amountOut: ethers.parseUnits(order.amountOut, 18),
    expiry: order.expiry,
    salt: order.salt
  };
  const signature = order.signature; // maker's signature
  console.log("Submitting fill for order", order.id);
  const tx = await orderbook.fillOrder(orderStruct, signature);
  console.log("tx:", tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});