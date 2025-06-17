<script setup>
import { ref, computed } from "vue";

const sellQuotes = ref([]);
const buyQuotes = ref([]);
const lastPrice = ref(21657.5);
const previousLastPrice = ref(21656.0);
const hoveredRow = ref(null);

const lastPriceClass = computed(() => {
  if (lastPrice.value > previousLastPrice.value) {
    return ["text-buy", "bg-buyBar"];
  } else if (lastPrice.value < previousLastPrice.value) {
    return ["text-sell", "bg-sellBar"];
  } else {
    return ["text-textMain", "bg-gray-500/10"];
  }
});

const lastPriceDisplay = computed(() => {
  return `${lastPrice.value.toLocaleString()} ↑`;
});

const formatPrice = (price) => price.toFixed(1);
const formatNumber = (num) => num.toLocaleString();

const sizeCellClass = (quote) => {
  if (quote.sizeChange === "increase") return "bg-flashGreen/50";
  if (quote.sizeChange === "decrease") return "bg-flashRed/50";
  return "";
};
</script>

<template>
  <div class="order-book bg-deep text-textMain max-w-sm font-sans">
    <h2 class="text-l text-left font-semibold m-2">Order Book</h2>
    <div class="border-b-[0.5px] border-b-gray-700"></div>
    <div class="table flex flex-col">
      <div class="row head grid grid-cols-3 py-1 text-textSecondary font-bold">
        <div>Price (USD)</div>
        <div>Size</div>
        <div>Total</div>
      </div>

      <div
        v-for="(quote, index) in sellQuotes"
        :key="'sell-' + index"
        class="grid grid-cols-3 py-1 items-center transition-colors duration-300"
        :class="[
          'sell',
          hoveredRow === 'sell-' + index ? 'bg-hover' : '',
          quote.isNew ? 'bg-flashRed/50' : '',
          quote.isChanged ? 'animate-pulse' : '',
        ]"
        @mouseover="hoveredRow = 'sell-' + index"
        @mouseleave="hoveredRow = null"
      >
        <div class="text-sell">{{ formatPrice(quote.price) }}</div>
        <div :class="sizeCellClass(quote)">{{ formatNumber(quote.size) }}</div>
        <div>{{ formatNumber(quote.total) }}</div>
      </div>

      <div
        class="grid grid-cols-3 justify-center font-bold text-center py-2"
        :class="lastPriceClass"
      >
        <div class="col-span-3">{{ lastPriceDisplay }}</div>
      </div>

      <div
        v-for="(quote, index) in buyQuotes"
        :key="'buy-' + index"
        class="grid grid-cols-3 py-1 items-center transition-colors duration-300"
        :class="[
          'buy',
          hoveredRow === 'buy-' + index ? 'bg-hover' : '',
          quote.isNew ? 'bg-flashGreen/50' : '',
          quote.isChanged ? 'animate-pulse' : '',
        ]"
        @mouseover="hoveredRow = 'buy-' + index"
        @mouseleave="hoveredRow = null"
      >
        <div class="text-buy">{{ formatPrice(quote.price) }}</div>
        <div :class="sizeCellClass(quote)">{{ formatNumber(quote.size) }}</div>
        <div>{{ formatNumber(quote.total) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
