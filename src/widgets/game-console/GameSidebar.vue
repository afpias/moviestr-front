<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'

import { DifficultySelector } from '@features/select-difficulty'
import { GenreSelector } from '@features/select-genre'
import type { GameDifficulty, GameGenre } from '@shared/types/game'
import { Button } from '@shared/ui'

interface GameSidebarProps {
	difficulty: GameDifficulty
	disabled: boolean
	genre: GameGenre
}

defineProps<GameSidebarProps>()

const emit = defineEmits<{
	restart: []
	selectDifficulty: [difficulty: GameDifficulty]
	selectGenre: [genre: GameGenre]
}>()
</script>

<template>
	<aside class="game-sidebar">
		<section class="game-sidebar__section">
			<p class="control-label">Жанр</p>
			<GenreSelector :disabled="disabled" :model-value="genre" @update:model-value="emit('selectGenre', $event)" />
		</section>

		<section class="game-sidebar__section">
			<p class="control-label">Сложность</p>
			<DifficultySelector
				:model-value="difficulty"
				:readonly="disabled"
				variant="list"
				@update:model-value="emit('selectDifficulty', $event)"
			/>
		</section>

		<Button class="game-sidebar__restart" :disabled="disabled" type="button" variant="ghost" @click="emit('restart')">
			<RotateCcw :size="16" /> Перезапустить раунд
		</Button>
	</aside>
</template>

<style scoped src="./GameSidebar.css"></style>
