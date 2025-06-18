import {
  WS_RETRY_DELAY_BASE,
  MAX_RECONNECT_NUM
} from '@/constants/orderBook.js';

/**
 * Create a resilient WebSocket channel
 * @param {Object} opts
 * @param {string} opts.url
 * @param {string} opts.topic
 * @param {(msg: any) => void} opts.onMessage
 * @param {(topic: string) => boolean} [opts.extraFunc]
 * @returns {{ close: () => void }}
 */

export function createWsChannel({ url, topic, onMessage, extraFunc }) {
  let socket = null;
  let retryCount = 0;

  const connect = () => {
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      retryCount = 0;
      socket.send(JSON.stringify({ op: 'subscribe', args: [topic] }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data || '{}');
        const isMatch = extraFunc
          ? extraFunc(msg.topic)
          : msg.topic === topic;

        if (isMatch && msg.data) {
          onMessage(msg.data, msg);
        }
      } catch (e) {
        console.log('[WS message parse error]', e);
      }
    });

    socket.addEventListener('error', () => reconnect());
    socket.addEventListener('close', () => reconnect());
  };

  const reconnect = () => {
    if (retryCount >= MAX_RECONNECT_NUM) return;
    setTimeout(connect, WS_RETRY_DELAY_BASE * Math.pow(2, retryCount));
    retryCount++;
  };

  const close = () => socket?.close();

  connect();
  return { close };
}