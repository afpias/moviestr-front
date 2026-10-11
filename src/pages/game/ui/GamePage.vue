<script setup lang="ts">
import { AlertTriangle, RefreshCcw } from '@lucide/vue'

import { Button, Skeleton } from '@shared/ui'
import { GameInfo } from '@widgets/game-info'
import { GameSidebar } from '@widgets/game-sidebar'
import { GameStage } from '@widgets/game-stage'

import { useGameConsole } from '../model/useGameConsole'

const {
	actionLabel,
	answer,
	attemptedMovieIds,
	completeSearch,
	continueRound,
	currentAttempt,
	currentFrame,
	difficulty,
	genre,
	isBusy,
	isSearching,
	lastError,
	restartRound,
	retryLoading,
	retryRound,
	roundResult,
	selectDifficulty,
	selectGenre,
	status,
	submitAction,
	suggestions,
	totalFrames
} = useGameConsole()
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

		<div v-else-if="currentFrame" class="game-page__layout">
			<GameSidebar
				:difficulty="difficulty"
				:disabled="isBusy"
				:genre="genre"
				@restart="restartRound"
				@select-difficulty="selectDifficulty"
				@select-genre="selectGenre"
			/>

			<GameStage
				v-model="answer"
				:action-label="actionLabel"
				:attempted-movie-ids="attemptedMovieIds"
				:current-attempt="currentAttempt"
				:current-frame="currentFrame"
				:difficulty="difficulty"
				:is-busy="isBusy"
				:is-searching="isSearching"
				:round-result="roundResult"
				:status="status"
				:suggestions="suggestions"
				:total-frames="totalFrames"
				@continue="continueRound"
				@retry="retryRound"
				@search="completeSearch"
				@select-difficulty="selectDifficulty"
				@submit="submitAction"
			/>

			<GameInfo :current-attempt="currentAttempt" :total-frames="totalFrames" />
		</div>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
