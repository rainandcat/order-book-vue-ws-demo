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
import { getOrderTopic, getTradeTopic } from '@/utils/wsTopics.js';

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

  let orderSocket = null;
  let tradeSocket = null;
  let lastSeq = 0;
  let rawSell = [];
  let rawBuy = [];
  let updateFrame = null;
  let reconnectAttempts = 0;

  const orderWsUrl = import.meta.env.VITE_ORDER_WS_URL;
  const tradeWsUrl = import.meta.env.VITE_TRADE_WS_URL;

  const throttledUpdate = throttle(() => {
    const nextSell = buildSide(sellQuotes.value, rawSell, false);
    const nextBuy = buildSide(buyQuotes.value, rawBuy, true);
    sellQuotes.value = applyDiff(sellQuotes.value, nextSell);
    buyQuotes.value = applyDiff(buyQuotes.value, nextBuy);
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

  /**
   * @param {QuoteVM[]} prev
   * @param {[number, number][]} raw
   * @param {boolean} isBuy
   * @returns {QuoteVM[]}
   */
  const buildSide = (prev, raw, isBuy) => {
    const filtered = [...raw].filter(([, size]) => size > 0);
    const sorted = filtered.sort((a, b) => (isBuy ? b[0] - a[0] : a[0] - b[0]));
    const fullTotalSize = sorted.reduce((sum, [, size]) => sum + size, 0);
    const padded = sorted.slice(0, ORDER_BOOK_DEPTH);
    while (padded.length < ORDER_BOOK_DEPTH) padded.push([0, 0]);

    const totalSize = padded.reduce((sum, [, size]) => sum + size, 0);
    let running = 0;
    return padded.map(([price, size]) => {
      running += size;
      const existed = prev.find((q) => q.price === price);
      const sizeChange = existed
        ? size > existed.size
          ? 'increase'
          : size < existed.size
          ? 'decrease'
          : null
        : null;

      return {
        price,
        size,
        total: running,
        percent: fullTotalSize > 0 ? running / fullTotalSize : 0,
        isNew: !existed,
        isChanged: !!existed && existed.size !== size,
        sizeChange,
      };
    });
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
    orderSocket = new WebSocket(orderWsUrl);

    orderSocket.addEventListener('open', () => {
      reconnectAttempts = 0;
      orderSocket.send(JSON.stringify({ op: 'subscribe', args: [orderTopic] }));
    });

    orderSocket.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data || '{}');
        if (msg.topic !== orderTopic) return;

        const payload = msg.data;
        if (!payload) return;

        if (payload.type === 'snapshot') {
          lastSeq = payload.seqNum;
          rawSell = normalizeSide(payload?.asks || []);
          rawBuy = normalizeSide(payload?.bids || []);
          cleanupRawData();
          scheduleUpdate();
        } else if (payload.type === 'delta') {
          if (payload.prevSeqNum !== lastSeq) {
            reconnectOrderWS();
            return;
          }
          lastSeq = payload.seqNum;
          rawSell = mergeDeltas(rawSell, normalizeSide(payload?.asks || []), false);
          rawBuy = mergeDeltas(rawBuy, normalizeSide(payload?.bids || []), true);
          cleanupRawData();
          scheduleUpdate();
        }
      } catch (e) {
        console.error('Order WS error:', e);
        reconnectOrderWS();
      }
    });

    orderSocket.addEventListener('error', () => {
      reconnectOrderWS();
    });

    orderSocket.addEventListener('close', () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connectOrderWS, BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts));
        reconnectAttempts++;
      }
    });
  };

  const reconnectOrderWS = () => {
    if (orderSocket) orderSocket.close();
    connectOrderWS();
  };

  const connectTradeWS = () => {
    if (!tradeWsUrl) throw new Error('VITE_TRADE_WS_URL not defined');
    tradeSocket = new WebSocket(tradeWsUrl);

    tradeSocket.addEventListener('open', () => {
      reconnectAttempts = 0;
      tradeSocket.send(JSON.stringify({ op: 'subscribe', args: [tradeTopic] }));
    });

    tradeSocket.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data || '{}');
        if (msg.topic !== 'tradeHistoryApi') return;
        const price = Number(msg.data?.[0]?.price);
        if (!price) return;
        previousLastPrice.value = lastPrice.value;
        lastPrice.value = price;
      } catch (e) {
        console.error('Trade WS error:', e);
        reconnectTradeWS();
      }
    });

    tradeSocket.addEventListener('error', () => {
      reconnectTradeWS();
    });

    tradeSocket.addEventListener('close', () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connectTradeWS, BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts));
        reconnectAttempts++;
      }
    });
  };

  const reconnectTradeWS = () => {
    if (tradeSocket) tradeSocket.close();
    connectTradeWS();
  };

  onMounted(() => {
    connectOrderWS();
    connectTradeWS();
  });

  onBeforeUnmount(() => {
    orderSocket?.close();
    tradeSocket?.close();
    if (updateFrame) cancelAnimationFrame(updateFrame);
    throttledUpdate.cancel();
  });

  return { sellQuotes, buyQuotes, lastPrice, previousLastPrice };
}