// Number of visible entries in order book (buy/sell sides each)
export const ORDER_BOOK_DEPTH = 8;

// Max retained raw quote entries
export const MAX_RAW_QUOTES = 50;

// Duration (ms) for flashing new/changed rows
export const FLASH_DURATION_MS = 1500;

// Throttle interval (ms) for order updates
export const ORDER_UPDATE_THROTTLE_MS = 250;

// Max number of WebSocket reconnect attempts
export const MAX_RECONNECT_NUM = 5;

// Base delay (ms) between reconnect attempts
export const WS_RETRY_DELAY_BASE = 1000;