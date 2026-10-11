<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
</script>

<template>
	<section class="status-page">
		<p class="status-page__code">404</p>
		<p class="eyebrow">Сцена вырезана</p>
		<h1>Такой страницы нет</h1>
		<p>Похоже, этот кадр не вошёл в финальный монтаж.</p>
		<RouterLink class="text-link" to="/">На главную <ArrowRight :size="18" /></RouterLink>
	</section>
</template>
