<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	Grid2X2,
	Image,
	RefreshCcw,
	RotateCcw,
	SkipForward,
	Sparkles
} from '@lucide/vue'

import { DifficultySelector } from '@features/select-difficulty'
import { searchMovies } from '@shared/api/movies.api'
import { getDifficultyOption, getNextDifficulty } from '@shared/lib/game-difficulty'
import { GAME_GENRE_OPTIONS, isGameGenre } from '@shared/lib/game-genres'
import { useGameStore } from '@shared/stores/game.store'
import type { GameDifficulty, MovieSuggestion } from '@shared/types/game'
import { Alert, Button, MovieCombobox, Skeleton } from '@shared/ui'

const gameStore = useGameStore()
const { currentFrame, difficulty, genre, lastError, status, totalFrames } = storeToRefs(gameStore)
const answer = ref<MovieSuggestion | string | null>(null)
const feedbackMessage = ref<string | null>(null)
const isSearching = ref(false)
const searchError = ref<string | null>(null)
const suggestions = ref<MovieSuggestion[]>([])
let latestSearchId = 0

const currentAttempt = computed(() => (currentFrame.value?.index ?? 0) + 1)
const difficultyOption = computed(() => getDifficultyOption(difficulty.value))
const isBusy = computed(() => status.value === 'loading' || status.value === 'submitting')
const selectedMovie = computed<MovieSuggestion | null>(() =>
	typeof answer.value === 'object' && answer.value !== null ? answer.value : null
)
const actionLabel = computed(() => {
	if (status.value === 'submitting') {
		return selectedMovie.value ? 'Проверяем…' : 'Открываем…'
	}

	return selectedMovie.value ? 'Угадать' : 'Пропустить'
})

function clearAnswer(): void {
	answer.value = null
	suggestions.value = []
	searchError.value = null
	isSearching.value = false
	latestSearchId += 1
}

async function completeSearch(query: string): Promise<void> {
	if (query.trim().length < 2) {
		suggestions.value = []
		searchError.value = null
		return
	}

	const searchId = ++latestSearchId
	isSearching.value = true
	searchError.value = null

	try {
		const results = await searchMovies(query)

		if (searchId === latestSearchId) {
			suggestions.value = results
		}
	} catch {
		if (searchId === latestSearchId) {
			suggestions.value = []
			searchError.value = 'Не удалось найти фильмы. Попробуйте ещё раз.'
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
	feedbackMessage.value = null
	await gameStore.switchDifficulty(selectedDifficulty)
}

async function selectGenre(event: Event): Promise<void> {
	if (!(event.target instanceof HTMLSelectElement) || !isGameGenre(event.target.value) || isBusy.value) {
		return
	}

	clearAnswer()
	feedbackMessage.value = null
	await gameStore.switchGenre(event.target.value)
}

async function restartRound(): Promise<void> {
	if (isBusy.value) {
		return
	}

	clearAnswer()
	feedbackMessage.value = null
	await gameStore.restartRound()

	if (!gameStore.lastError) {
		feedbackMessage.value = 'Раунд перезапущен с режима Easy.'
	}
}

async function submitAction(): Promise<void> {
	if (isBusy.value) {
		return
	}

	const wasLastFrame = currentAttempt.value === totalFrames.value
	const previousDifficulty = difficulty.value
	const movie = selectedMovie.value
	feedbackMessage.value = null

	if (!movie) {
		await gameStore.skipFrame()
		clearAnswer()

		if (!gameStore.lastError) {
			feedbackMessage.value = wasLastFrame
				? 'Кадры закончились — показываем новый фильм этого режима.'
				: 'Показываем следующий кадр.'
		}

		return
	}

	const isCorrect = await gameStore.submitGuess(movie.title)
	clearAnswer()

	if (isCorrect === true) {
		const nextDifficulty = getDifficultyOption(getNextDifficulty(previousDifficulty)).label
		feedbackMessage.value =
			previousDifficulty === 'impossible'
				? 'Impossible пройден — начинаем новый цикл с Easy.'
				: `Верно! Переходим в режим ${nextDifficulty}.`
		return
	}

	if (isCorrect === false) {
		feedbackMessage.value = wasLastFrame
			? 'Не угадано — показываем новый фильм этого режима.'
			: 'Не угадано — показываем следующий кадр.'
	}
}

async function retryLoading(): Promise<void> {
	await gameStore.switchDifficulty(difficulty.value)
}

onMounted(gameStore.initializeGame)
</script>

<template>
	<section class="game-page">
		<div v-if="status === 'idle' || status === 'loading'" class="game-loading" aria-label="Загрузка фильма">
			<Skeleton class="h-12 w-full rounded-xl" />
			<Skeleton class="aspect-video w-full rounded-[var(--app-radius-large)]" />
			<Skeleton class="h-12 w-full rounded-xl" />
		</div>

		<div v-else-if="status === 'error'" class="status-page">
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
					<div class="genre-select">
						<Grid2X2 :size="16" aria-hidden="true" />
						<select :disabled="isBusy" :value="genre" aria-label="Жанр фильма" @change="selectGenre">
							<option v-for="option in GAME_GENRE_OPTIONS" :key="option.value" :value="option.value">
								{{ option.label }}
							</option>
						</select>
						<ChevronDown :size="15" aria-hidden="true" />
					</div>
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
				<header class="game-stage__header">
					<div>
						<p class="eyebrow">Solo · {{ difficultyOption.label }}</p>
						<h1>Назови этот фильм</h1>
					</div>
					<DifficultySelector
						:model-value="difficulty"
						:readonly="isBusy"
						variant="pills"
						@update:model-value="selectDifficulty"
					/>
				</header>

				<figure class="movie-frame">
					<img :key="currentFrame.url" :alt="currentFrame.alt" :src="currentFrame.url" />
					<figcaption><Image :size="14" /> Кадр {{ currentAttempt }} / {{ totalFrames }}</figcaption>
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
						<Button :disabled="isBusy" type="submit">
							<CheckCircle2 v-if="selectedMovie" :size="17" />
							<SkipForward v-else :size="17" />
							{{ actionLabel }}
						</Button>
					</div>
					<p class="answer-form__hint">
						{{ selectedMovie ? `Выбран фильм «${selectedMovie.title}»` : 'Выбери фильм из списка или пропусти кадр' }}
					</p>
				</form>

				<Alert v-if="feedbackMessage" class="game-page__alert" role="status">
					<template #icon><Sparkles /></template>
					{{ feedbackMessage }}
				</Alert>
				<Alert v-if="searchError || lastError" class="game-page__alert" variant="destructive" role="alert">
					<template #icon><AlertTriangle /></template>
					{{ searchError ?? lastError }}
				</Alert>
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
				<section>
					<p class="control-label">Режим</p>
					<p>{{ difficultyOption.label }}</p>
					<small>{{ difficultyOption.startRank }}–{{ difficultyOption.endRank }} место</small>
				</section>
			</aside>
		</div>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
