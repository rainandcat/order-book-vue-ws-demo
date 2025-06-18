// Number of visible entries in order book (buy/sell sides each)
export const ORDER_BOOK_DEPTH = 8;

// Max retained raw quote entries (for performance)
export const MAX_RAW_QUOTES = 50;

// Duration (ms) for flashing new/changed rows
export const FLASH_DURATION_MS = 1500;

// Throttle interval (ms) for order updates
export const ORDER_UPDATE_THROTTLE_MS = 500;

// Max number of WebSocket reconnect attempts
export const MAX_RECONNECT_ATTEMPTS = 5;

// Base delay (ms) between reconnect attempts (doubles each time)
export const BASE_RECONNECT_DELAY = 1000;