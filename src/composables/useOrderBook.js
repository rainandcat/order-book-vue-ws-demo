/**
 * @typedef {Object} Quote
 * @property {number} price - Quote price
 * @property {number} size - Quote size
 */

/**
 * @typedef {Object} QuoteVM
 * @property {number} price
 * @property {number} size
 * @property {number} total
 * @property {number} percent
 * @property {boolean} isNew
 * @property {boolean} isChanged
 * @property {'increase' | 'decrease' | null} sizeChange
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';
import { throttle } from 'lodash';
import { buildQuoteVM } from './useOrderBookViewModel';

import { getOrderTopic, getTradeTopic } from '@/utils/wsTopics.js';
import { createWsChannel } from '@/utils/createWsChannel.js';

import {
  ORDER_BOOK_DEPTH,
  MAX_RAW_QUOTES,
  ORDER_UPDATE_THROTTLE_MS,
  MAX_RECONNECT_ATTEMPTS,
  BASE_RECONNECT_DELAY,
} from '@/constants/orderBook.js';

export function useOrderBook(options = {}) {
  const symbol = options.symbol || 'BTCPFC';
  const orderTopic = getOrderTopic(symbol);
  const tradeTopic = getTradeTopic(symbol);

  /** @type {import('vue').Ref<QuoteVM[]>} */
  const sellQuotes = ref([]);
  /** @type {import('vue').Ref<QuoteVM[]>} */
  const buyQuotes = ref([]);
  /** @type {import('vue').Ref<number>} */
  const lastPrice = ref(0);
  /** @type {import('vue').Ref<number>} */
  const previousLastPrice = ref(0);

  let orderChannel = null;
  let tradeChannel = null;
  // let lastSeq = 0;
  let rawSell = [];
  let rawBuy = [];
  let updateFrame = null;
  // let reconnectAttempts = 0;

  const orderWsUrl = import.meta.env.VITE_ORDER_WS_URL;
  const tradeWsUrl = import.meta.env.VITE_TRADE_WS_URL;

  const throttledUpdate = throttle(() => {
    sellQuotes.value = applyDiff(sellQuotes.value, buildQuoteVM(rawSell, sellQuotes.value, false));
    buyQuotes.value  = applyDiff(buyQuotes.value,  buildQuoteVM(rawBuy,  buyQuotes.value, true));
    updateFrame = null;
  }, ORDER_UPDATE_THROTTLE_MS);

  const scheduleUpdate = () => {
    if (updateFrame) return;
    updateFrame = requestAnimationFrame(throttledUpdate);
  };

  const normalizeSide = (sideArr) => {
    if (!Array.isArray(sideArr)) return [];
    return sideArr
      .filter(([p, s]) => typeof p === 'string' && typeof s === 'string' && !isNaN(p) && !isNaN(s))
      .map(([p, s]) => [Number(p), Number(s)]);
  };

  const applyDiff = (prev, next) => {
    return next.map((item, i) => {
      const old = prev[i];
      return old && old.price === item.price && old.size === item.size ? old : item;
    });
  };

  const mergeDeltas = (prev, updates, isBuy) => {
    const map = new Map(prev.map(([p, s]) => [p, s]));
    for (const [p, s] of updates) {
      if (s === 0) map.delete(p);
      else map.set(p, s);
    }
    return Array.from(map.entries()).sort((isBuy ? (a, b) => b[0] - a[0] : (a, b) => a[0] - b[0]));
  };

  const cleanupRawData = () => {
    rawSell = rawSell.filter(([price, size]) => size > 0 && price > 0).slice(0, MAX_RAW_QUOTES);
    rawBuy = rawBuy.filter(([price, size]) => size > 0 && price > 0).slice(0, MAX_RAW_QUOTES);
  };

  const connectOrderWS = () => {
    if (!orderWsUrl) throw new Error('VITE_ORDER_WS_URL not defined');

    orderChannel = createWsChannel({
      url: orderWsUrl,
      topic: orderTopic,
      onMessage: (data) => {
        if (data.type === 'snapshot') {
          rawSell = normalizeSide(data?.asks || []);
          rawBuy = normalizeSide(data?.bids || []);
          cleanupRawData();
          scheduleUpdate();
        } else if (data.type === 'delta') {
          rawSell = mergeDeltas(rawSell, normalizeSide(data?.asks || []), false);
          rawBuy = mergeDeltas(rawBuy, normalizeSide(data?.bids || []), true);
          cleanupRawData();
          scheduleUpdate();
        }
      }
    });
  };

  const connectTradeWS = () => {
    if (!tradeWsUrl) throw new Error('VITE_TRADE_WS_URL not defined');

    tradeChannel = createWsChannel({
      url: tradeWsUrl,
      topic: tradeTopic,
      shouldHandleMessage: (incomingTopic) =>incomingTopic === 'tradeHistoryApi',
      onMessage: (data) => {
        const price = Number(data?.[0]?.price);
        if (!price) return;
        previousLastPrice.value = lastPrice.value;
        lastPrice.value = price;
      }
    });
  };

  onMounted(() => {
    connectOrderWS();
    connectTradeWS();
  });

  onBeforeUnmount(() => {
    orderChannel?.close();
    tradeChannel?.close();
    if (updateFrame) cancelAnimationFrame(updateFrame);
    throttledUpdate.cancel();
  });

  return { sellQuotes, buyQuotes, lastPrice, previousLastPrice };
}