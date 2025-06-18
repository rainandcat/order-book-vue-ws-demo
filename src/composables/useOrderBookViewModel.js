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
  const totalSize = sorted.reduce((sum, [, size]) => sum + size, 0);

  const visible = sorted.slice(0, depth);
  while (visible.length < depth) visible.push([0, 0]);

  let accSize = 0;

  return visible.map(([price, size]) => {
    accSize += size;
    
    const existed = prev.find((q) => q.price === price);

    let sizeChange = null;
    if (existed && existed.size !== size) {
      if (size > existed.size) sizeChange = 'increase';
      else sizeChange = 'decrease';
    }

    return {
      price,
      size,
      total: accSize,
      percent: totalSize > 0 ? accSize / totalSize : 0,
      isNew: !existed,
      isChanged: !!existed && existed.size !== size,
      sizeChange
    };
  });
}
