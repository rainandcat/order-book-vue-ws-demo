import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useOrderBook () {
  const sellQuotes = ref(/** @type {QuoteRow[]} */([]))
  const buyQuotes  = ref(/** @type {QuoteRow[]} */([]))
  const lastPrice = ref(0)
  const previousLastPrice = ref(0)

  let orderSocket = null
  let tradeSocket = null
  let lastSeq     = 0

  let rawSell = []
  let rawBuy = []
  let updateFrame = null

  const normalizeSide = (sideArr) => {
    if (!Array.isArray(sideArr)) return []
    return sideArr.map(([p, s]) => [Number(p), Number(s)])
  }

  const buildSide = (prev, raw, isBuy) => {
    const filtered = [...raw].filter(([, size]) => size > 0)
    const sorted = filtered.sort((a, b) => isBuy ? b[0] - a[0] : a[0] - b[0])
    const padded = sorted.slice(0, 8)
    while (padded.length < 8) padded.push([0, 0])

    const totalSize = padded.reduce((sum, [, size]) => sum + size, 0)
    let running = 0
    return padded.map(([price, size]) => {
      running += size
      const existed = prev.find(q => q.price === price)
      const sizeChange = existed ? (size > existed.size ? 'increase' : size < existed.size ? 'decrease' : null) : null
      return {
        price,
        size,
        total: running,
        percent: totalSize > 0 ? running / totalSize : 0,
        isNew: !existed,
        isChanged: !!existed && existed.size !== size,
        sizeChange
      }
    })
  }

  const applyDiff = (prev, next) => {
    return next.map((item, i) => {
      const old = prev[i]
      return old && old.price === item.price && old.size === item.size ? old : item
    })
  }

  const scheduleUpdate = () => {
    if (updateFrame) return
    updateFrame = requestAnimationFrame(() => {
      const nextSell = buildSide(sellQuotes.value, rawSell, false)
      const nextBuy  = buildSide(buyQuotes.value, rawBuy, true)
      sellQuotes.value = applyDiff(sellQuotes.value, nextSell)
      buyQuotes.value  = applyDiff(buyQuotes.value, nextBuy)
      updateFrame = null
    })
  }

  const connectOrderWS = () => {
    orderSocket = new WebSocket('wss://ws.btse.com/ws/oss/futures')

    orderSocket.addEventListener('open', () => {
      console.log('[Order WS] Connected')
      orderSocket.send(JSON.stringify({ op: 'subscribe', args: ['update:BTCPFC'] }))
    })

    orderSocket.addEventListener('message', evt => {
      const msg = JSON.parse(evt.data || '{}')
      if (msg.topic !== 'update:BTCPFC') return

      const payload = msg.data
      if (!payload) return

      if (payload.type === 'snapshot') {
        lastSeq = payload.seqNum
        const asks = normalizeSide(payload?.asks || [])
        const bids = normalizeSide(payload?.bids || [])
        rawSell = asks
        rawBuy  = bids
        scheduleUpdate()
      } else if (payload.type === 'delta') {
        if (payload.prevSeqNum !== lastSeq) {
          console.warn('[Order WS] seq mismatch, resync')
          reconnectOrderWS()
          return
        }
        lastSeq = payload.seqNum
        const asks = normalizeSide(payload?.asks || [])
        const bids = normalizeSide(payload?.bids || [])

        rawSell = mergeDeltas(rawSell, asks, false)
        rawBuy  = mergeDeltas(rawBuy,  bids, true)
        scheduleUpdate()
      }
    })
  }

  const mergeDeltas = (prev, updates, isBuy) => {
    const map = new Map(prev.map(([p, s]) => [p, s]))
    for (const [p, s] of updates) {
      if (s === 0) map.delete(p)
      else map.set(p, s)
    }
    return Array.from(map.entries()).sort((a, b) => isBuy ? b[0] - a[0] : a[0] - b[0])
  }

  const reconnectOrderWS = () => {
    if (orderSocket) orderSocket.close()
    connectOrderWS()
  }

  const connectTradeWS = () => {
    tradeSocket = new WebSocket('wss://ws.btse.com/ws/futures')

    tradeSocket.addEventListener('open', () => {
      tradeSocket.send(JSON.stringify({ op: 'subscribe', args: ['tradeHistoryApi:BTCPFC'] }))
    })

    tradeSocket.addEventListener('message', evt => {
      const msg = JSON.parse(evt.data || '{}')
      if (msg.topic !== 'tradeHistoryApi') return
      const price = Number(msg.data?.[0]?.price)
      if (!price) return
      previousLastPrice.value = lastPrice.value
      lastPrice.value = price
    })
  }

  onMounted(() => {
    connectOrderWS()
    connectTradeWS()
  })

  onBeforeUnmount(() => {
    orderSocket?.close()
    tradeSocket?.close()
    cancelAnimationFrame(updateFrame)
  })

  return { sellQuotes, buyQuotes, lastPrice, previousLastPrice }
}
