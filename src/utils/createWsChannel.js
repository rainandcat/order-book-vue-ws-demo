import {
  BASE_RECONNECT_DELAY,
  MAX_RECONNECT_ATTEMPTS
} from '@/constants/orderBook.js';

/**
 * Create a resilient WebSocket channel
 * @param {Object} opts
 * @param {string} opts.url
 * @param {string} opts.topic
 * @param {(msg: any) => void} opts.onMessage
 * @param {(topic: string) => boolean} [opts.shouldHandleMessage] - optional topic filter 
 * @returns {{ close: () => void }}
 */

export function createWsChannel({ url, topic, onMessage, shouldHandleMessage }) {
  let socket = null;
  let attempts = 0;

  const connect = () => {
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      attempts = 0;
      socket.send(JSON.stringify({ op: 'subscribe', args: [topic] }));
    });

    socket.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data || '{}');
        const isMatch = shouldHandleMessage
          ? shouldHandleMessage(msg.topic)
          : msg.topic === topic;

        if (isMatch && msg.data) {
          onMessage(msg.data, msg);
        }
      } catch (e) {
        console.error('[WS message parse error]', e);
      }
    });

    socket.addEventListener('error', () => reconnect());
    socket.addEventListener('close', () => reconnect());
  };

  const reconnect = () => {
    if (attempts >= MAX_RECONNECT_ATTEMPTS) return;
    setTimeout(connect, BASE_RECONNECT_DELAY * Math.pow(2, attempts));
    attempts++;
  };

  const close = () => socket?.close();

  connect();
  return { close };
}