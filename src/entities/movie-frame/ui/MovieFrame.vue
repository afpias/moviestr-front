<script setup lang="ts">
import { ref, watch } from 'vue'

import { ImageOff, LoaderCircle } from '@lucide/vue'

import type { GameFrame } from '@shared/types/game'
import { Button } from '@shared/ui'

const props = defineProps<{ frame: GameFrame }>()
const loaded = ref(false)
const failed = ref(false)
const retryKey = ref(0)

watch(
	() => props.frame.url,
	() => {
		loaded.value = false
		failed.value = false
	},
	{ immediate: true }
)

function retry(): void {
	loaded.value = false
	failed.value = false
	retryKey.value += 1
}
</script>

<template>
	<figure class="room-frame" :aria-busy="!loaded && !failed">
		<img
			:key="frame.url + retryKey"
			:src="frame.url"
			:alt="loaded ? frame.alt : ''"
			:class="{ 'is-loaded': loaded }"
			decoding="async"
			@load="loaded = true"
			@error="failed = true"
		/>
		<div v-if="!loaded" class="room-frame__loading" role="status">
			<ImageOff v-if="failed" :size="24" aria-hidden="true" />
			<LoaderCircle v-else :size="24" aria-hidden="true" />
			<span>{{ failed ? 'Не удалось загрузить кадр' : 'Загружаем кадр…' }}</span>
			<Button v-if="failed" variant="secondary" @click="retry">Повторить</Button>
		</div>
	</figure>
</template>

<style scoped src="./MovieFrame.css"></style>
