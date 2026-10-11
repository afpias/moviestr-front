<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { AlertTriangle, CheckCircle2, Image, RefreshCcw, RotateCcw, SkipForward } from '@lucide/vue'

import { DifficultySelector } from '@features/select-difficulty'
import { GenreSelector } from '@features/select-genre'
import { RoundResult } from '@features/show-round-result'
import { searchMovies } from '@shared/api/movies.api'
import { useGameStore } from '@shared/stores/game.store'
import type { GameDifficulty, GameGenre, MovieSuggestion } from '@shared/types/game'
import { Button, MovieCombobox, Skeleton } from '@shared/ui'

const gameStore = useGameStore()
const { currentFrame, difficulty, genre, lastError, roundResult, status, totalFrames } = storeToRefs(gameStore)
const answer = ref<MovieSuggestion | string | null>(null)
const isSearching = ref(false)
const suggestions = ref<MovieSuggestion[]>([])
let latestSearchId = 0

const currentAttempt = computed(() => (currentFrame.value?.index ?? 0) + 1)
const isBusy = computed(() => status.value === 'loading' || status.value === 'submitting')
const selectedMovie = computed<MovieSuggestion | null>(() =>
	typeof answer.value === 'object' && answer.value !== null ? answer.value : null
)
const actionLabel = computed(() => {
	if (status.value === 'submitting') {
		return selectedMovie.value ? 'Проверяем…' : currentAttempt.value === totalFrames.value ? 'Сдаёмся…' : 'Открываем…'
	}

	return selectedMovie.value ? 'Угадать' : currentAttempt.value === totalFrames.value ? 'Сдаться' : 'Пропустить'
})

function clearAnswer(): void {
	answer.value = null
	suggestions.value = []
	isSearching.value = false
	latestSearchId += 1
}

async function completeSearch(query: string): Promise<void> {
	if (query.trim().length < 2) {
		suggestions.value = []
		return
	}

	const searchId = ++latestSearchId
	isSearching.value = true

	try {
		const results = await searchMovies(query)

		if (searchId === latestSearchId) {
			suggestions.value = results
		}
	} catch {
		if (searchId === latestSearchId) {
			suggestions.value = []
		}
	} finally {
		if (searchId === latestSearchId) {
			isSearching.value = false
		}
	}
}

async function selectDifficulty(selectedDifficulty: GameDifficulty): Promise<void> {
	if (isBusy.value || selectedDifficulty === difficulty.value) {
		return
	}

	clearAnswer()
	await gameStore.switchDifficulty(selectedDifficulty)
}

async function selectGenre(selectedGenre: GameGenre): Promise<void> {
	if (isBusy.value || selectedGenre === genre.value) {
		return
	}

	clearAnswer()
	await gameStore.switchGenre(selectedGenre)
}

async function restartRound(): Promise<void> {
	if (isBusy.value) {
		return
	}

	clearAnswer()
	await gameStore.restartRound()
}

async function submitAction(): Promise<void> {
	if (isBusy.value) {
		return
	}

	const movie = selectedMovie.value

	if (!movie) {
		await gameStore.skipFrame()
		clearAnswer()
		return
	}

	await gameStore.submitGuess(movie.title)
	clearAnswer()
}

async function continueRound(): Promise<void> {
	clearAnswer()
	await gameStore.continueAfterWin()
}

async function retryRound(): Promise<void> {
	clearAnswer()
	await gameStore.retryAfterLoss()
}

async function retryLoading(): Promise<void> {
	await gameStore.switchDifficulty(difficulty.value)
}

watch(
	difficulty,
	(value) => {
		document.documentElement.dataset.gameDifficulty = value
	},
	{ immediate: true }
)

onBeforeUnmount(() => {
	delete document.documentElement.dataset.gameDifficulty
})

onMounted(gameStore.initializeGame)
</script>

<template>
	<section class="game-page">
		<div v-if="status === 'idle' || (status === 'loading' && !currentFrame)" class="game-loading" aria-label="Загрузка фильма">
			<Skeleton class="h-12 w-full rounded-xl" />
			<Skeleton class="aspect-video w-full rounded-[var(--app-radius-large)]" />
			<Skeleton class="h-12 w-full rounded-xl" />
		</div>

		<div v-else-if="status === 'error' && !currentFrame" class="status-page">
			<div class="status-page__icon" aria-hidden="true"><AlertTriangle /></div>
			<p class="eyebrow">Ошибка загрузки</p>
			<h1>Кадр потерялся</h1>
			<p role="alert">{{ lastError }}</p>
			<Button type="button" @click="retryLoading"><RefreshCcw :size="17" /> Попробовать снова</Button>
		</div>

		<div v-else-if="currentFrame" class="game-console">
			<aside class="game-sidebar">
				<section class="game-sidebar__section">
					<p class="control-label">Жанр</p>
					<GenreSelector :disabled="isBusy" :model-value="genre" @update:model-value="selectGenre" />
				</section>

				<section class="game-sidebar__section">
					<p class="control-label">Сложность</p>
					<DifficultySelector
						:model-value="difficulty"
						:readonly="isBusy"
						variant="list"
						@update:model-value="selectDifficulty"
					/>
				</section>

				<Button class="game-sidebar__restart" type="button" variant="ghost" @click="restartRound">
					<RotateCcw :size="16" /> Перезапустить раунд
				</Button>
			</aside>

			<div class="game-stage">
				<RoundResult
					v-if="roundResult && (status === 'won' || status === 'lost')"
					:result="roundResult"
					:status="status"
					@continue="continueRound"
					@retry="retryRound"
				/>

				<template v-else>
					<div class="game-stage__toolbar">
						<DifficultySelector
							:model-value="difficulty"
							:readonly="isBusy"
							variant="pills"
							@update:model-value="selectDifficulty"
						/>
					</div>

					<figure class="movie-frame" :aria-busy="status === 'loading'">
						<img :key="currentFrame.url" :alt="currentFrame.alt" :src="currentFrame.url" />
						<div v-if="status === 'loading'" class="movie-frame__loading" role="status">
							<RefreshCcw :size="22" aria-hidden="true" />
							<span>Загружаем новый кадр…</span>
						</div>
					</figure>

					<div class="frame-progress" aria-label="Прогресс изображений">
						<span
							v-for="frame in totalFrames"
							:key="frame"
							:class="{ 'is-active': frame === currentAttempt, 'is-used': frame < currentAttempt }"
						></span>
					</div>

					<form class="answer-form" @submit.prevent="submitAction">
						<label class="visually-hidden" for="movie-answer">Название фильма</label>
						<div class="answer-form__controls">
							<MovieCombobox
								v-model="answer"
								input-id="movie-answer"
								:suggestions="suggestions"
								:disabled="isBusy"
								:is-loading="isSearching"
								placeholder="Найди фильм по названию"
								@search="completeSearch"
							/>
							<Button class="answer-form__submit" :disabled="isBusy" type="submit">
								<CheckCircle2 v-if="selectedMovie" :size="17" />
								<SkipForward v-else :size="17" />
								{{ actionLabel }}
							</Button>
						</div>
					</form>
				</template>
			</div>

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
		</div>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
