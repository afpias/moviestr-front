<script setup lang="ts">
import { DIFFICULTY_OPTIONS } from '@shared/lib/game-difficulty'
import type { GameDifficulty } from '@shared/types/game'

interface DifficultySelectorProps {
	ariaLabel?: string
	modelValue: GameDifficulty | null
	readonly?: boolean
	variant?: 'list' | 'pills'
}

const props = withDefaults(defineProps<DifficultySelectorProps>(), {
	ariaLabel: 'Сложность игры',
	readonly: false,
	variant: 'pills'
})

const emit = defineEmits<{
	'update:modelValue': [difficulty: GameDifficulty]
}>()

function selectDifficulty(difficulty: GameDifficulty): void {
	if (!props.readonly) {
		emit('update:modelValue', difficulty)
	}
}
</script>

<template>
	<div
		:aria-label="props.ariaLabel"
		:class="[`difficulty-selector--${props.variant}`]"
		class="difficulty-selector"
		role="radiogroup"
	>
		<button
			v-for="option in DIFFICULTY_OPTIONS"
			:key="option.value"
			:aria-checked="props.modelValue === option.value"
			:class="[`difficulty-selector__option--${option.value}`, { 'is-active': props.modelValue === option.value }]"
			:disabled="props.readonly"
			class="difficulty-selector__option"
			role="radio"
			type="button"
			@click="selectDifficulty(option.value)"
		>
			<span>{{ option.label }}</span>
		</button>
	</div>
</template>

<style scoped src="./DifficultySelector.css"></style>
