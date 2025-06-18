export function getOrderTopic(symbol) {
  return `update:${symbol}`;
}

export function getTradeTopic(symbol) {
  return `tradeHistoryApi:${symbol}`;
}