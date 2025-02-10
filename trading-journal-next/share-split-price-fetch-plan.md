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
  - Direct CSV data as a temporary source of truth.
- Log discrepancies for further review.

## 5. Future Integration with TradingView
- The processed trade data and split events will later be integrated into TradingView charts.
- Ensure the processed data aligns with the formatting requirements of TradingView's widget.

## 6. Summary
- Maintain simplicity with a focus on mapping and data validation.
- Leverage free resources like Yahoo Finance API.
- Enhance reliability with a secondary CSV validation step.

This plan provides the foundational guidelines for implementing share split price fetch, ensuring that trade data remains accurate and consistent despite discrepancies in ticker symbols.