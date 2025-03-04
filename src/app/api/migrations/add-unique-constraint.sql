-- Add unique constraint to trades table
ALTER TABLE trades
ADD CONSTRAINT trades_unique_identifier UNIQUE (ticker, timestamp, action, shares, price);