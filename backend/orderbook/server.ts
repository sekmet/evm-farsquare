import express from "express";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";

const app = express();
app.use(bodyParser.json());

type Order = {
  id: string;
  maker: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  expiry: number;
  salt: number;
  signature: string;
};

const orders: Record<string, Order> = {};

app.post("/orders", (req, res) => {
  const id = randomUUID();
  const order: Order = { id, ...req.body };
  orders[id] = order;
  res.json({ id });
});

app.get("/orders", (req, res) => {
  res.json(Object.values(orders));
});

app.delete("/orders/:id", (req, res) => {
  delete orders[req.params.id];
  res.sendStatus(204);
});

app.listen(3001, () => {
  console.log("Orderbook server listening on http://localhost:3001");
});