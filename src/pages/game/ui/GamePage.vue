<script setup lang="ts">
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
		<div class="game-page__layout">
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
				:last-error="lastError"
				:round-result="roundResult"
				:status="status"
				:suggestions="suggestions"
				:total-frames="totalFrames"
				@continue="continueRound"
				@retry="retryRound"
				@retry-loading="retryLoading"
				@search="completeSearch"
				@select-difficulty="selectDifficulty"
				@submit="submitAction"
			/>
			<GameInfo :current-attempt="currentAttempt" :total-frames="totalFrames" />
		</div>
	</section>
</template>

<style scoped src="./GamePage.css"></style>
