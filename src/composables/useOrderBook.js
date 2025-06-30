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
import { buildQuoteVM } from './useOrderBookViewModel';

import { getOrderTopic, getTradeTopic } from '@/utils/wsTopics.js';
import { createWsChannel } from '@/utils/createWsChannel.js';

import {
  MAX_RAW_QUOTES,
} from '@/constants/orderBook.js';

export function useOrderBook(options = {}) {
  const sellQuotes = ref([]);
  const buyQuotes = ref([]);
  const lastPrice = ref(0);
  const previousLastPrice = ref(0);

  const symbol = options.symbol || 'BTCPFC';
  const orderTopic = getOrderTopic(symbol);
  const tradeTopic = getTradeTopic(symbol);

  let orderChannel = null;
  let tradeChannel = null;
  let rawSell = [];
  let rawBuy = [];
  let updateFrame = null;

  // Load WebSocket URLs from .env variables
  const orderWsUrl = import.meta.env.VITE_ORDER_WS_URL;
  const tradeWsUrl = import.meta.env.VITE_TRADE_WS_URL;

  const update = () => {
    sellQuotes.value = applyDiff(sellQuotes.value, buildQuoteVM(rawSell, sellQuotes.value, false));
    buyQuotes.value  = applyDiff(buyQuotes.value,  buildQuoteVM(rawBuy,  buyQuotes.value, true));
    updateFrame = null;
  };

  const scheduleUpdate = () => {
    if (updateFrame) return;
    updateFrame = requestAnimationFrame(update);
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
    const priceSizeMap = new Map(prev.map(([price, size]) => [price, size]));
    
    for (const [price, size] of updates) {
      if (size === 0) {
        priceSizeMap.delete(price);
      } else {
        priceSizeMap.set(price, size);
      }
    }

    return Array.from(priceSizeMap.entries()).sort((a, b) => {
      const [priceA, priceB] = [a[0], b[0]];
      return isBuy ? priceB - priceA : priceA - priceB;
    });
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
      extraFunc: (incomingTopic) =>incomingTopic === 'tradeHistoryApi',
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
  });

  return { sellQuotes, buyQuotes, lastPrice, previousLastPrice };
}