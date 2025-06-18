# Order Book

A high-performance real-time Order Book component built with **Vue 3**, **Vite**, and **WebSocket**, designed for crypto trading platforms.

## Live Demo

🔗 [**Try the demo on Vercel**](https://order-book-vue-ws-demo.vercel.app/)

## Tech Stack

- Vue 3 (Composition API)
- Vite
- Tailwind CSS
- WebSocket
- Throttle (lodash)
- GitHub + Vercel

## Project Structure

src/  
├─ components/  
│ └─ OrderBook.vue  
├─ composables/  
│ ├─ useOrderBook.js  
│ ├─ useOrderBookViewModel.js  
│ └─ useOrderBookFormat.js  
├─ utils/  
│ ├─ createWsChannel.js  
│ └─ wsTopics.js  
├─ constants/  
│ └─ orderBook.js

Create a `.env` file with:

```
VITE_ORDER_WS_URL=wss://ws.btse.com/ws/oss/futures
VITE_TRADE_WS_URL=wss://ws.btse.com/ws/futures
```

## Local Development

```
# Install dependencies
npm install

# Run dev server
npm run dev
```
