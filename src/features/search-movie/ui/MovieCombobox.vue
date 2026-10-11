<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'

import { LoaderCircle } from '@lucide/vue'

import type { MovieSuggestion } from '@shared/types/game'
import { Combobox, ComboboxAnchor, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList, ComboboxViewport } from '@shared/ui'

interface MovieComboboxProps {
	attemptedMovieIds?: string[]
	disabled?: boolean
	inputId: string
	isLoading?: boolean
	modelValue: MovieSuggestion | string | null
	placeholder?: string
	suggestions: MovieSuggestion[]
}

const props = withDefaults(defineProps<MovieComboboxProps>(), {
	attemptedMovieIds: () => [],
	disabled: false,
	isLoading: false,
	placeholder: ''
})

const emit = defineEmits<{
	search: [query: string]
	'update:modelValue': [value: MovieSuggestion | string | null]
}>()

const displayValue = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : (props.modelValue?.title ?? '')))
const selectedId = computed(() => (typeof props.modelValue === 'object' ? props.modelValue?.id : undefined))
const attemptedMovieIdSet = computed(() => new Set(props.attemptedMovieIds))
let searchTimeout: ReturnType<typeof setTimeout> | undefined

function updateQuery(query: string): void {
	emit('update:modelValue', query)

	if (searchTimeout) {
		clearTimeout(searchTimeout)
	}

	searchTimeout = setTimeout(() => emit('search', query), 250)
}

function selectSuggestion(value: unknown): void {
	if (typeof value !== 'string' || attemptedMovieIdSet.value.has(value)) {
		return
	}

	const suggestion = props.suggestions.find((item) => item.id === value)
	if (suggestion) {
		emit('update:modelValue', suggestion)
	}
}

onBeforeUnmount(() => {
	if (searchTimeout) {
		clearTimeout(searchTimeout)
	}
})
</script>

<template>
	<Combobox
		:disabled="props.disabled"
		:ignore-filter="true"
		:model-value="selectedId"
		:reset-search-term-on-blur="false"
		:reset-search-term-on-select="false"
		open-on-click
		open-on-focus
		@update:model-value="selectSuggestion"
	>
		<ComboboxAnchor class="movie-combobox__anchor relative w-full">
			<ComboboxInput
				:id="props.inputId"
				:disabled="props.disabled"
				:model-value="displayValue"
				:placeholder="props.placeholder"
				class="movie-combobox__input"
				@update:model-value="updateQuery"
			/>
			<LoaderCircle
				v-if="props.isLoading"
				class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
			/>
		</ComboboxAnchor>

		<ComboboxList
			v-if="props.suggestions.length > 0"
			align="start"
			class="movie-combobox__list w-[var(--reka-combobox-trigger-width)]"
			side="top"
		>
			<ComboboxViewport class="movie-combobox__viewport">
				<ComboboxGroup>
					<ComboboxItem
						v-for="suggestion in props.suggestions"
						:key="suggestion.id"
						:class="{ 'is-attempted': attemptedMovieIdSet.has(suggestion.id) }"
						:disabled="attemptedMovieIdSet.has(suggestion.id)"
						:text-value="`${suggestion.title} ${suggestion.englishTitle}`"
						:value="suggestion.id"
						class="movie-combobox__option"
					>
						<span class="movie-combobox__titles">
							<span class="movie-combobox__title">
								{{ suggestion.title }} <span>({{ suggestion.releaseYear }})</span>
							</span>
							<span v-if="suggestion.englishTitle !== suggestion.title" class="movie-combobox__original-title">
								{{ suggestion.englishTitle }}
							</span>
						</span>
						<span v-if="attemptedMovieIdSet.has(suggestion.id)" class="movie-combobox__attempted-label"> Уже выбрано </span>
					</ComboboxItem>
				</ComboboxGroup>
			</ComboboxViewport>
		</ComboboxList>
	</Combobox>
</template>

<style scoped src="./MovieCombobox.css"></style>
