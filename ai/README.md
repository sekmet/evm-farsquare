# FarSquare AI

Simple AI prototype and data pipeline guidance.

- Use Envio to stream enriched events into a time-series DB (TimescaleDB or ClickHouse).
- Use HyperIndex for low-latency queries.
- Train models on combined on-chain & off-chain features:
  - on-chain: volume, liquidity, trade frequency, spread, price impact
  - off-chain: property price indices, rental yields, locale risk scores, macro indicators

Example: ai/simple_model.py is a tiny prototype that uses synthetic features for scoring tokens/properties.
