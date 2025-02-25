# Implementation Plan: Share Split Price Fetch and Ticker Normalization

## Overview
This document outlines a simple approach to handle share split events in trade data by fetching historical split data from Yahoo Finance, normalizing ticker symbols, and cross-validating with CSV data for accuracy.

## 1. Ticker Normalization
- Maintain a mapping between Trading212 tickers and Yahoo Finance tickers.
- Use a simple JSON or in-memory mapping structure.
- Resolve discrepancies using product names and known patterns.

## 2. Data Fetching
- Use a free, community-supported library such as "yahoo-finance2" to fetch historical split data.
- Retrieve data using the normalized Yahoo Finance ticker.
- Also fetch daily price data for validation.

## 3. CSV Data Validation
- Extract product name and currency from the CSV file.
- Compare the fetched price data from Yahoo Finance with the CSV price for the same date.
- If discrepancies are found, use the CSV product name to confirm or adjust the ticker mapping.

## 4. Fallback Strategy
- If the price data does not match, fall back to using:
  - An alternative ticker from mapping.
  - Direct CSV data as temporary source of truth.
- Log discrepancies for further review.

## 5. Share Split Integration
- Represent share split events as special trade legs within the trade group:
  - Create a virtual "SPLIT" trade leg with action type "SPLIT".
  - Include split ratio (e.g., 4:1) in the trade leg details.
  - Set the trade date to match the split event date.
  - Tag the trade leg as system-generated.
- Position Size Calibration:
  - Adjust the number of shares for all trades before the split date:
    - For buys: Multiply shares by split ratio.
    - For sells: Multiply shares by split ratio.
  - Adjust the average entry price:
    - Divide the price by split ratio to maintain position value.
  - Update cost basis calculations to reflect split-adjusted values.
- Historical Data Normalization:
  - Apply split adjustments retroactively to all historical trades.
  - Maintain both raw and split-adjusted metrics for reference.
  - Display clear indicators when viewing split-adjusted data.

## 6. Future Integration with TradingView
- The processed trade data and split events will later be integrated into TradingView charts.
- Ensure the processed data aligns with the formatting requirements of TradingView's widget.

## 7. Summary
- Maintain simplicity with a focus on mapping and data validation.
- Leverage free resources like Yahoo Finance API.
- Enhance reliability with a secondary CSV validation step.
- Handle share splits transparently through virtual trade legs.
- Keep position sizing accurate through automatic adjustments.

This plan provides the foundational guidelines for implementing share split price fetch, ensuring that trade data remains accurate and consistent despite discrepancies in ticker symbols and share split events.