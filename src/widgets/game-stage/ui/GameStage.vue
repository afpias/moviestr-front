<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { AlertTriangle, CheckCircle2, RefreshCcw, SkipForward } from '@lucide/vue'

import { MovieCombobox } from '@features/search-movie'
import { DifficultySelector } from '@features/select-difficulty'
import { RoundResult } from '@features/show-round-result'
import type { GameDifficulty, GameFrame, GameResult, GameStatus, MovieSuggestion } from '@shared/types/game'
import { Button, Skeleton } from '@shared/ui'

interface GameStageProps {
	actionLabel: string
	attemptedMovieIds: string[]
	currentAttempt: number | null
	currentFrame: GameFrame | null
	difficulty: GameDifficulty | null
	lastError?: string | null
	isBusy: boolean
	isSearching: boolean
	roundResult: GameResult | null
	status: GameStatus
	suggestions: MovieSuggestion[]
	totalFrames: number
}

const props = defineProps<GameStageProps>()
const emit = defineEmits<{
	continue: []
	retry: []
	retryLoading: []
	search: [query: string]
	selectDifficulty: [difficulty: GameDifficulty]
	submit: []
}>()
const answer = defineModel<MovieSuggestion | string | null>({ required: true })
const isFrameLoaded = ref(false)
const hasFrameError = ref(false)

const isSelectedMovie = computed(() => typeof answer.value === 'object' && answer.value !== null)
const roundStatus = computed<'lost' | 'won' | null>(() =>
	props.status === 'lost' || props.status === 'won' ? props.status : null
)

function markFrameLoaded(): void {
	isFrameLoaded.value = true
	hasFrameError.value = false
}

function markFrameFailed(): void {
	hasFrameError.value = true
}

watch(
	() => props.currentFrame?.url,
	() => {
		isFrameLoaded.value = false
		hasFrameError.value = false
	},
	{ immediate: true }
)
</script>

<template>
	<div class="game-stage">
		<RoundResult
			v-if="props.roundResult && roundStatus && props.status !== 'loading'"
			:result="props.roundResult"
			:status="roundStatus"
			@continue="emit('continue')"
			@retry="emit('retry')"
		/>
		<template v-else>
			<div class="game-stage__toolbar">
				<DifficultySelector
					:model-value="props.difficulty"
					:readonly="props.isBusy || !props.currentFrame"
					variant="pills"
					@update:model-value="emit('selectDifficulty', $event)"
				/>
			</div>
			<figure
				class="movie-frame"
				:aria-busy="props.status === 'idle' || props.status === 'loading' || (props.status !== 'error' && !isFrameLoaded)"
			>
				<div
					v-if="props.status === 'idle' || props.status === 'loading'"
					class="game-stage__loading"
					role="status"
					aria-label="Загрузка фильма"
				>
					<Skeleton class="game-stage__skeleton" />
					<span>Готовим фильм…</span>
				</div>
				<div v-else-if="props.status === 'error'" class="game-stage__error">
					<AlertTriangle :size="28" aria-hidden="true" />
					<h2>Кадр потерялся</h2>
					<p role="alert">{{ props.lastError }}</p>
					<Button type="button" @click="emit('retryLoading')"><RefreshCcw :size="17" /> Попробовать снова</Button>
				</div>
				<template v-else-if="props.currentFrame">
					<img
						:key="props.currentFrame.url"
						:alt="isFrameLoaded ? props.currentFrame.alt : ''"
						:class="{ 'is-loaded': isFrameLoaded }"
						:src="props.currentFrame.url"
						@error="markFrameFailed"
						@load="markFrameLoaded"
					/>
					<div v-if="!isFrameLoaded" class="movie-frame__loading" role="status">
						<RefreshCcw v-if="!hasFrameError" :size="22" aria-hidden="true" />
						<span>{{ hasFrameError ? 'Не удалось загрузить изображение' : 'Загружаем новый кадр…' }}</span>
					</div>
				</template>
			</figure>
			<div class="frame-progress" aria-label="Прогресс изображений">
				<span
					v-for="frame in props.totalFrames"
					:key="frame"
					:class="{
						'is-active': frame === props.currentAttempt,
						'is-used': props.currentAttempt !== null && frame < props.currentAttempt
					}"
				></span>
			</div>
			<form class="answer-form" @submit.prevent="emit('submit')">
				<label class="visually-hidden" for="movie-answer">Название фильма</label>
				<div class="answer-form__controls">
					<MovieCombobox
						v-model="answer"
						:attempted-movie-ids="props.attemptedMovieIds"
						input-id="movie-answer"
						:suggestions="props.suggestions"
						:disabled="props.isBusy || !props.currentFrame || props.status === 'error'"
						:is-loading="props.isSearching"
						placeholder="Найди фильм по названию"
						@search="emit('search', $event)"
					/>
					<Button
						class="answer-form__submit"
						:disabled="props.isBusy || !props.currentFrame || props.status === 'error'"
						type="submit"
					>
						<CheckCircle2 v-if="isSelectedMovie" :size="17" /><SkipForward v-else :size="17" />{{ props.actionLabel }}
					</Button>
				</div>
			</form>
		</template>
		<p v-if="props.lastError && props.status !== 'error'" role="alert">{{ props.lastError }}</p>
	</div>
</template>

<style scoped src="./GameStage.css"></style>
