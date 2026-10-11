<script setup lang="ts">
import { ArrowRight, ChartNoAxesColumnIncreasing } from '@lucide/vue'
</script>

<template>
	<section class="status-page">
		<div class="status-page__icon" aria-hidden="true"><ChartNoAxesColumnIncreasing /></div>
		<p class="eyebrow">История игр</p>
		<h1>Здесь появятся сыгранные раунды</h1>
		<p>Победы и выбранные режимы можно будет посмотреть после первой стабильной версии.</p>
		<RouterLink class="text-link" to="/">Вернуться к игре <ArrowRight :size="18" /></RouterLink>
	</section>
</template>
