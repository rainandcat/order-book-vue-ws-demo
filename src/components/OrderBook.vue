<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useOrderBook } from "@/composables/useOrderBook";
import { useOrderBookFormat } from "@/composables/useOrderBookFormat";
import IconArrowDown from "@/assets/IconArrowDown.svg?component";

import { FLASH_DURATION_MS } from "@/constants/orderBook.js";

const props = defineProps({
  symbol: {
    type: String,
    required: true,
  },
});

const { sellQuotes, buyQuotes, lastPrice, previousLastPrice } = useOrderBook({
  symbol: props.symbol,
});
const hoveredRow = ref(null);

const { formatPrice, formatNumber, sizeCellClass } = useOrderBookFormat();

const lastPriceClass = computed(() => {
  if (lastPrice.value > previousLastPrice.value)
    return ["text-buy", "bg-buyBar"];
  if (lastPrice.value < previousLastPrice.value)
    return ["text-sell", "bg-sellBar"];
  return ["text-textMain", "bg-grayBar"];
});
const isPriceUp = computed(() => lastPrice.value > previousLastPrice.value);
const isPriceDown = computed(() => lastPrice.value < previousLastPrice.value);
const lastPriceDisplay = computed(() => lastPrice.value.toLocaleString());

function flashRow(quote, color) {
  if (quote.flashColor) return;
  quote.flashColor = color;
  nextTick(() =>
    setTimeout(() => {
      quote.flashColor = null;
    }, FLASH_DURATION_MS)
  );
}

watch(
  () => sellQuotes.value.map((q) => ({ isNew: q.isNew, price: q.price })),
  (list) => {
    list.forEach((q, i) => {
      if (q.isNew) {
        flashRow(sellQuotes.value[i], "red");
        sellQuotes.value[i].isNew = false;
      }
    });
  }
);

watch(
  () => buyQuotes.value.map((q) => ({ isNew: q.isNew, price: q.price })),
  (list) => {
    list.forEach((q, i) => {
      if (q.isNew) {
        flashRow(buyQuotes.value[i], "green");
        buyQuotes.value[i].isNew = false;
      }
    });
  }
);
</script>

<template>
  <div class="order-book bg-deep text-textMain max-w-sm font-sans">
    <h2 class="text-l font-semibold m-2">Order Book</h2>
    <div class="border-b-[0.5px] border-b-gray-700"></div>

    <div class="flex flex-col mb-2">
      <div class="grid grid-cols-3 p-2 text-textSecondary font-bold">
        <div>Price (USD)</div>
        <div class="text-right">Size</div>
        <div class="text-right">Total</div>
      </div>

      <div
        v-for="(q, i) in sellQuotes.slice().reverse()"
        :key="`sell-${i}`"
        class="relative py-1 pr-2 transition-colors duration-300 overflow-hidden"
        :class="[
          hoveredRow === `sell-${i}` && 'bg-hover',
          q.flashColor === 'red' && 'animate-flash-red',
        ]"
        @mouseover="hoveredRow = `sell-${i}`"
        @mouseleave="hoveredRow = null"
      >
        <div
          class="pointer-events-none absolute inset-y-0 right-0 bg-sellBar"
          :style="{ width: q.percent * 100 + '%' }"
        ></div>

        <div class="relative z-10 grid grid-cols-3 items-center">
          <div class="text-sell">{{ formatPrice(q.price) }}</div>
          <div :class="sizeCellClass(q)">{{ formatNumber(q.size) }}</div>
          <div class="text-right">{{ formatNumber(q.total) }}</div>
        </div>
      </div>

      <div
        class="grid grid-cols-3 font-bold text-center py-2 my-1"
        :class="lastPriceClass"
      >
        <div class="col-span-3 flex items-center justify-center gap-1 text-lg">
          <span>{{ lastPriceDisplay }}</span>
          <IconArrowDown
            v-if="isPriceUp || isPriceDown"
            class="scale-90"
            :class="{ 'rotate-180': isPriceUp, 'rotate-0': isPriceDown }"
          />
        </div>
      </div>

      <div
        v-for="(q, i) in buyQuotes"
        :key="`buy-${i}`"
        class="relative py-1 pr-2 transition-colors duration-300 overflow-hidden"
        :class="[
          hoveredRow === `buy-${i}` && 'bg-hover',
          q.flashColor === 'green' && 'animate-flash-green',
        ]"
        @mouseover="hoveredRow = `buy-${i}`"
        @mouseleave="hoveredRow = null"
      >
        <div
          class="pointer-events-none absolute inset-y-0 right-0 bg-buyBar"
          :style="{ width: q.percent * 100 + '%' }"
        ></div>

        <div class="relative z-10 grid grid-cols-3 items-center">
          <div class="text-buy">{{ formatPrice(q.price) }}</div>
          <div :class="sizeCellClass(q)">{{ formatNumber(q.size) }}</div>
          <div class="text-right">{{ formatNumber(q.total) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>