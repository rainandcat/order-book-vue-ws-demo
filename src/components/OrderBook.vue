<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useOrderBook } from "@/composables/useOrderBook";
import IconArrowDown from "@/assets/IconArrowDown.svg?component";

const { sellQuotes, buyQuotes, lastPrice, previousLastPrice } = useOrderBook();
const hoveredRow = ref(null);

const lastPriceClass = computed(() => {
  if (lastPrice.value > previousLastPrice.value)
    return ["text-buy", "bg-buyBar"];
  if (lastPrice.value < previousLastPrice.value)
    return ["text-sell", "bg-sellBar"];
  return ["text-textMain", "bg-gray-500/10"];
});
const isPriceUp = computed(() => lastPrice.value > previousLastPrice.value);
const isPriceDown = computed(() => lastPrice.value < previousLastPrice.value);
const lastPriceDisplay = computed(() => lastPrice.value.toLocaleString());

const formatPrice = (p) =>
  p.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const formatNumber = (n) => n.toLocaleString();

const sizeCellClass = (q) => {
  if (q.sizeChange === "increase") return "bg-flashGreen/50 text-right";
  if (q.sizeChange === "decrease") return "bg-flashRed/50 text-right";
  return "text-right";
};

function flashRow(quote, color) {
  quote.flashColor = color;
  nextTick(() =>
    setTimeout(() => {
      quote.flashColor = null;
    }, 1500)
  );
}

watch(
  sellQuotes,
  (list) => {
    list.forEach((q) => {
      if (q.isNew) {
        flashRow(q, "red");
        q.isNew = false;
      }
    });
  },
  { deep: true }
);

watch(
  buyQuotes,
  (list) => {
    list.forEach((q) => {
      if (q.isNew) {
        flashRow(q, "green");
        q.isNew = false;
      }
    });
  },
  { deep: true }
);
</script>

<template>
  <div class="order-book bg-deep text-textMain max-w-sm font-sans">
    <h2 class="text-l font-semibold m-2">Order Book</h2>
    <div class="border-b-[0.5px] border-b-gray-700"></div>

    <div class="flex flex-col mb-2">
      <div class="grid grid-cols-3 p-2 text-textSecondary font-bold">
        <div>Price&nbsp;(USD)</div>
        <div class="text-right">Size</div>
        <div class="text-right">Total</div>
      </div>

      <div
        v-for="(q, i) in [...sellQuotes].reverse()"
        :key="`sell-${i}`"
        class="relative py-1 pr-2 transition-colors duration-300 overflow-hidden"
        :class="[
          hoveredRow === `sell-${i}` && 'bg-hover',
          q.flashColor === 'red' && 'animate-flash-red',
          q.isChanged && 'animate-pulse',
        ]"
        @mouseover="hoveredRow = `sell-${i}`"
        @mouseleave="hoveredRow = null"
      >
        <div
          class="pointer-events-none absolute inset-y-0 right-0 bg-red-500/10"
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
          q.isChanged && 'animate-pulse',
        ]"
        @mouseover="hoveredRow = `buy-${i}`"
        @mouseleave="hoveredRow = null"
      >
        <div
          class="pointer-events-none absolute inset-y-0 right-0 bg-green-500/10"
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
