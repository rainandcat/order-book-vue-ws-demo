import { ORDER_BOOK_DEPTH } from '@/constants/orderBook';

/**
 * @param {[number, number][]} raw
 * @param {QuoteVM[]} prev
 * @param {boolean} isBuy
 * @param {number} depth
 * @returns {QuoteVM[]}
 */
export function buildQuoteVM(raw, prev, isBuy, depth = ORDER_BOOK_DEPTH) {
  const filtered = raw.filter(([, size]) => size > 0);
  const sorted = filtered.sort((a, b) => isBuy ? b[0] - a[0] : a[0] - b[0]);
  const fullTotalSize = sorted.reduce((sum, [, size]) => sum + size, 0);

  const padded = sorted.slice(0, depth);
  while (padded.length < depth) padded.push([0, 0]);

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
      sizeChange
    };
  });
}
