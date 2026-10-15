<script setup lang="ts">
import { type Component, computed } from 'vue'

import { Eye, Ghost, Grid2X2, Heart, Orbit, Smile, Sparkles, Zap } from '@lucide/vue'

import { GAME_GENRE_OPTIONS, getGameGenreOption, isGameGenre } from '@shared/lib/game-genres'
import type { GameGenre } from '@shared/types/game'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui'

interface GenreSelectorProps {
	disabled?: boolean
	modelValue: GameGenre
}

const props = withDefaults(defineProps<GenreSelectorProps>(), {
	disabled: false
})

const emit = defineEmits<{
	'update:modelValue': [genre: GameGenre]
}>()

const genreIcons: Record<GameGenre, Component> = {
	action: Zap,
	all: Grid2X2,
	animation: Sparkles,
	comedy: Smile,
	drama: Heart,
	horror: Ghost,
	'science-fiction': Orbit,
	thriller: Eye
}

const selectedOption = computed(() => getGameGenreOption(props.modelValue))

function selectGenre(value: unknown): void {
	if (isGameGenre(value)) {
		emit('update:modelValue', value)
	}
}
</script>

<template>
	<Select :disabled="props.disabled" :model-value="props.modelValue" @update:model-value="selectGenre">
		<SelectTrigger class="genre-selector__trigger" aria-label="Жанр фильма">
			<component :is="genreIcons[props.modelValue]" class="genre-selector__icon" :size="17" aria-hidden="true" />
			<SelectValue :placeholder="selectedOption.label">{{ selectedOption.label }}</SelectValue>
		</SelectTrigger>

		<SelectContent class="genre-selector__content" align="start" position="popper">
			<SelectItem
				v-for="option in GAME_GENRE_OPTIONS"
				:key="option.value"
				:class="`genre-selector__item genre-selector__item--${option.value}`"
				:value="option.value"
			>
				<component :is="genreIcons[option.value]" class="genre-selector__item-icon" :size="17" aria-hidden="true" />
				<span>{{ option.label }}</span>
			</SelectItem>
		</SelectContent>
	</Select>
</template>

<style scoped src="./GenreSelector.css"></style>
