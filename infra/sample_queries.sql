-- Sample queries for analytics in Postgres / TimescaleDB / HyperIndex SQL
-- 1) Daily volume per token
SELECT
  date_trunc('day', block_time) AS day,
  token_in AS token,
  SUM(amount_in::numeric / 1e18) AS volume_in
FROM order_filled_events
GROUP BY 1, 2
ORDER BY 1 DESC
LIMIT 100;

-- 2) Top traded tokens by number of fills
SELECT token_in AS token, COUNT(*) AS fills
FROM order_filled_events
GROUP BY token_in
ORDER BY fills DESC
LIMIT 50;

-- 3) Whitelist changes over time
SELECT block_time, who, action
FROM (
  SELECT block_time, who, 'whitelist' AS action FROM whitelist_events WHERE event_name = 'Whitelisted'
  UNION ALL
  SELECT block_time, who, 'dewhitelist' AS action FROM whitelist_events WHERE event_name = 'Dewhitelisted'
) t
ORDER BY block_time DESC
LIMIT 200;

-- 4) Liquidity (deposits) by maker
SELECT maker, token, SUM(amount::numeric / 1e18) AS total_deposited
FROM deposits
GROUP BY maker, token
ORDER BY total_deposited DESC
LIMIT 100;