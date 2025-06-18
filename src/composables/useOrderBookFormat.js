function formatPrice(p) {
  return p.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatNumber(n) {
  return n.toLocaleString();
}

function sizeCellClass(quote) {
  switch (quote?.sizeChange) {
    case 'increase':
      return 'animate-flash-green text-right';
    case 'decrease':
      return 'animate-flash-red text-right';
    default:
      return 'text-right';
  }
}

export function useOrderBookFormat() {
  return {
    formatPrice,
    formatNumber,
    sizeCellClass,
  };
}