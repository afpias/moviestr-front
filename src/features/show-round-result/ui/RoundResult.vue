<script setup lang="ts">
import { computed } from 'vue'

import { ArrowRight, RotateCcw, Trophy } from '@lucide/vue'

import type { GameResult } from '@shared/types/game'
import { Button } from '@shared/ui'

interface RoundResultProps {
	result: GameResult
	status: 'lost' | 'won'
	action?: 'continue' | 'retry'
	actionDisabled?: boolean
}

const props = defineProps<RoundResultProps>()

const emit = defineEmits<{
	continue: []
	retry: []
}>()

const isWin = computed(() => props.status === 'won')
const isContinue = computed(() => (props.action ? props.action === 'continue' : isWin.value))
</script>

<template>
	<section class="round-result" :class="`round-result--${props.status}`" aria-label="Результат раунда">
		<div class="round-result__poster">
			<img :alt="`Постер фильма «${props.result.title}»`" :src="props.result.posterUrl" />
		</div>

		<div class="round-result__answer">
			<p>Правильный ответ</p>
			<h1>{{ props.result.title }}</h1>
			<span v-if="props.result.originalTitle !== props.result.title">{{ props.result.originalTitle }}</span>
			<small>{{ props.result.releaseYear }}</small>
		</div>

		<div class="round-result__badge">
			<Trophy v-if="isWin" :size="18" aria-hidden="true" />
			<RotateCcw v-else :size="18" aria-hidden="true" />
			{{ isWin ? 'Победа' : 'Не угадано' }}
		</div>

		<Button v-if="isContinue" class="round-result__action" size="lg" :disabled="props.actionDisabled" @click="emit('continue')">
			Далее <ArrowRight :size="18" aria-hidden="true" />
		</Button>
		<Button v-else class="round-result__action" size="lg" :disabled="props.actionDisabled" @click="emit('retry')">
			<RotateCcw :size="18" aria-hidden="true" /> Повторить
		</Button>
	</section>
</template>

<style scoped src="./RoundResult.css"></style>
