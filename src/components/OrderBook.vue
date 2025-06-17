<script setup>
import { ref, computed } from "vue";
import { useOrderBook } from "@/composables/useOrderBook";
import IconArrowDown from "@/assets/IconArrowDown.svg?component";

const { sellQuotes, buyQuotes, lastPrice, previousLastPrice } = useOrderBook();
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

const isPriceUp = computed(() => lastPrice.value > previousLastPrice.value);
const isPriceDown = computed(() => lastPrice.value < previousLastPrice.value);

const lastPriceDisplay = computed(() => {
  return lastPrice.value.toLocaleString();
});

const formatPrice = (price) => price.toFixed(1);
const formatNumber = (num) => num.toLocaleString();

const sizeCellClass = (quote) => {
  if (quote.sizeChange === "increase") return "bg-flashGreen/50 text-right";
  if (quote.sizeChange === "decrease") return "bg-flashRed/50 text-right";
  return "text-right";
};
</script>

<template>
  <div class="order-book bg-deep text-textMain max-w-sm font-sans">
    <h2 class="text-l text-left font-semibold m-2">Order Book</h2>
    <div class="border-b-[0.5px] border-b-gray-700"></div>
    <div class="table flex flex-col">
      <div class="row head grid grid-cols-3 p-2 text-textSecondary font-bold">
        <div>Price (USD)</div>
        <div class="text-right">Size</div>
        <div class="text-right">Total</div>
      </div>

      <div
        v-for="(quote, index) in sellQuotes"
        :key="'sell-' + index"
        class="relative py-1 pr-2 transition-colors duration-300"
        :class="[
          'sell',
          hoveredRow === 'sell-' + index ? 'bg-hover' : '',
          quote.isNew ? 'bg-flashRed/50' : '',
          quote.isChanged ? 'animate-pulse' : '',
        ]"
        @mouseover="hoveredRow = 'sell-' + index"
        @mouseleave="hoveredRow = null"
      >
        <div class="relative z-10 grid grid-cols-3 items-center">
          <div class="text-sell">{{ formatPrice(quote.price) }}</div>
          <div :class="sizeCellClass(quote)">
            {{ formatNumber(quote.size) }}
          </div>
          <div class="relative">
            <div
              class="absolute inset-y-0 right-0 bg-red-500/10"
              :style="{ width: quote.percent * 100 + '%' }"
            ></div>
            <div class="relative z-10 text-right">
              {{ formatNumber(quote.total) }}
            </div>
          </div>
        </div>
      </div>

      <div
        class="grid grid-cols-3 justify-center font-bold text-center py-2"
        :class="lastPriceClass"
      >
        <div class="col-span-3 flex items-center justify-center gap-1 text-lg">
          <span>{{ lastPriceDisplay }}</span>
          <IconArrowDown
            v-if="isPriceUp || isPriceDown"
            class="scale-90"
            :class="{
              'rotate-180': isPriceUp,
              'rotate-0': isPriceDown,
            }"
          />
        </div>
      </div>

      <div
        v-for="(quote, index) in buyQuotes"
        :key="'buy-' + index"
        class="relative py-1 pr-2 transition-colors duration-300"
        :class="[
          'buy',
          hoveredRow === 'buy-' + index ? 'bg-hover' : '',
          quote.isNew ? 'bg-flashGreen/50' : '',
          quote.isChanged ? 'animate-pulse' : '',
        ]"
        @mouseover="hoveredRow = 'buy-' + index"
        @mouseleave="hoveredRow = null"
      >
        <div class="relative z-10 grid grid-cols-3 items-center">
          <div class="text-buy">{{ formatPrice(quote.price) }}</div>
          <div :class="sizeCellClass(quote)">
            {{ formatNumber(quote.size) }}
          </div>
          <div class="relative">
            <div
              class="absolute inset-y-0 right-0 bg-green-500/10"
              :style="{ width: quote.percent * 100 + '%' }"
            ></div>
            <div class="relative z-10 text-right">
              {{ formatNumber(quote.total) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
