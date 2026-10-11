<script setup lang="ts">
import { Image } from '@lucide/vue'

interface GameInfoProps {
	currentAttempt: number
	totalFrames: number
}

defineProps<GameInfoProps>()
</script>

<template>
	<aside class="game-info" aria-label="Информация о текущем фильме">
		<section>
			<p class="control-label">Кадр</p>
			<strong>{{ String(currentAttempt).padStart(2, '0') }}</strong>
			<span>/ {{ String(totalFrames).padStart(2, '0') }}</span>
		</section>
		<section>
			<p class="control-label">Формат</p>
			<p><Image :size="16" /> Изображения</p>
		</section>
	</aside>
</template>

<style scoped src="./GameInfo.css"></style>
