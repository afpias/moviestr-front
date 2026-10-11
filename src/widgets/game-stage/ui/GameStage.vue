<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { CheckCircle2, RefreshCcw, SkipForward } from '@lucide/vue'

import { MovieCombobox } from '@features/search-movie'
import { DifficultySelector } from '@features/select-difficulty'
import { RoundResult } from '@features/show-round-result'
import type { GameDifficulty, GameFrame, GameResult, GameStatus, MovieSuggestion } from '@shared/types/game'
import { Button } from '@shared/ui'

interface GameStageProps {
	actionLabel: string
	attemptedMovieIds: string[]
	currentAttempt: number
	currentFrame: GameFrame
	difficulty: GameDifficulty
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
	() => props.currentFrame.url,
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
			v-if="props.roundResult && roundStatus"
			:result="props.roundResult"
			:status="roundStatus"
			@continue="emit('continue')"
			@retry="emit('retry')"
		/>

		<template v-else>
			<div class="game-stage__toolbar">
				<DifficultySelector
					:model-value="props.difficulty"
					:readonly="props.isBusy"
					variant="pills"
					@update:model-value="emit('selectDifficulty', $event)"
				/>
			</div>

			<figure class="movie-frame" :aria-busy="!isFrameLoaded || props.status === 'loading'">
				<img
					:key="props.currentFrame.url"
					:alt="isFrameLoaded ? props.currentFrame.alt : ''"
					:class="{ 'is-loaded': isFrameLoaded }"
					:src="props.currentFrame.url"
					@error="markFrameFailed"
					@load="markFrameLoaded"
				/>
				<div v-if="!isFrameLoaded || props.status === 'loading'" class="movie-frame__loading" role="status">
					<RefreshCcw v-if="!hasFrameError" :size="22" aria-hidden="true" />
					<span>{{ hasFrameError ? 'Не удалось загрузить изображение' : 'Загружаем новый кадр…' }}</span>
				</div>
			</figure>

			<div class="frame-progress" aria-label="Прогресс изображений">
				<span
					v-for="frame in props.totalFrames"
					:key="frame"
					:class="{ 'is-active': frame === props.currentAttempt, 'is-used': frame < props.currentAttempt }"
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
						:disabled="props.isBusy"
						:is-loading="props.isSearching"
						placeholder="Найди фильм по названию"
						@search="emit('search', $event)"
					/>
					<Button class="answer-form__submit" :disabled="props.isBusy" type="submit">
						<CheckCircle2 v-if="isSelectedMovie" :size="17" />
						<SkipForward v-else :size="17" />
						{{ props.actionLabel }}
					</Button>
				</div>
			</form>
		</template>
	</div>
</template>

<style scoped src="./GameStage.css"></style>
