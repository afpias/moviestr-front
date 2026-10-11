<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { Check, LoaderCircle, Search } from '@lucide/vue'

import type { MovieSuggestion } from '@shared/types/game'

interface MovieComboboxProps {
	disabled?: boolean
	inputId: string
	isLoading?: boolean
	modelValue: MovieSuggestion | string | null
	placeholder?: string
	suggestions: MovieSuggestion[]
}

const props = withDefaults(defineProps<MovieComboboxProps>(), {
	disabled: false,
	isLoading: false,
	placeholder: ''
})

const emit = defineEmits<{
	search: [query: string]
	'update:modelValue': [value: MovieSuggestion | string | null]
}>()

const activeIndex = ref(-1)
const isFocused = ref(false)
const listboxId = `movie-suggestions-${useId()}`
let searchTimeout: ReturnType<typeof setTimeout> | undefined

const displayValue = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : (props.modelValue?.title ?? '')))
const isOpen = computed(() => isFocused.value && props.suggestions.length > 0)
const activeOptionId = computed(() => (activeIndex.value >= 0 ? `${listboxId}-${activeIndex.value}` : undefined))

function scheduleSearch(query: string): void {
	if (searchTimeout) {
		clearTimeout(searchTimeout)
	}

	searchTimeout = setTimeout(() => emit('search', query), 250)
}

function updateInput(event: Event): void {
	if (!(event.target instanceof HTMLInputElement)) {
		return
	}

	activeIndex.value = -1
	emit('update:modelValue', event.target.value)
	scheduleSearch(event.target.value)
}

function selectSuggestion(suggestion: MovieSuggestion): void {
	emit('update:modelValue', suggestion)
	isFocused.value = false
	activeIndex.value = -1
}

function moveActiveOption(direction: 1 | -1): void {
	if (!isOpen.value) {
		return
	}

	const lastIndex = props.suggestions.length - 1
	activeIndex.value = direction === 1 ? Math.min(activeIndex.value + 1, lastIndex) : Math.max(activeIndex.value - 1, 0)
}

function selectActiveOption(event: KeyboardEvent): void {
	const suggestion = props.suggestions[activeIndex.value]

	if (!isOpen.value || !suggestion) {
		return
	}

	event.preventDefault()
	selectSuggestion(suggestion)
}

watch(
	() => props.suggestions,
	() => {
		activeIndex.value = -1
	}
)

onBeforeUnmount(() => {
	if (searchTimeout) {
		clearTimeout(searchTimeout)
	}
})
</script>

<template>
	<div class="relative w-full">
		<Search class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-[var(--app-color-text-muted)]" />
		<input
			:id="props.inputId"
			:aria-activedescendant="activeOptionId"
			:aria-controls="listboxId"
			:aria-expanded="isOpen"
			:disabled="props.disabled"
			:placeholder="props.placeholder"
			:value="displayValue"
			autocomplete="off"
			class="h-12 w-full rounded-[calc(var(--radius)*0.75)] border border-[var(--app-color-border)] bg-[var(--app-color-surface-raised)] pr-10 pl-10 text-[var(--app-color-text)] shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-[var(--app-color-text-muted)] focus:border-[hsl(var(--ring)/0.6)] focus:ring-3 focus:ring-[hsl(var(--ring)/0.18)] disabled:cursor-not-allowed disabled:opacity-55"
			role="combobox"
			@blur="isFocused = false"
			@focus="isFocused = true"
			@input="updateInput"
			@keydown.down.prevent="moveActiveOption(1)"
			@keydown.enter="selectActiveOption"
			@keydown.esc="isFocused = false"
			@keydown.up.prevent="moveActiveOption(-1)"
		/>
		<LoaderCircle
			v-if="props.isLoading"
			class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[var(--app-color-text-muted)]"
		/>

		<ul
			v-if="isOpen"
			:id="listboxId"
			class="absolute top-[calc(100%+0.4rem)] z-40 max-h-72 w-full overflow-y-auto rounded-[calc(var(--radius)*0.75)] border border-[var(--app-color-border)] bg-[var(--app-color-surface-raised)] p-1.5 shadow-[var(--app-shadow-large)]"
			role="listbox"
		>
			<li
				v-for="(suggestion, index) in props.suggestions"
				:id="`${listboxId}-${index}`"
				:key="suggestion.id"
				:aria-selected="index === activeIndex"
				:class="index === activeIndex && 'bg-[hsl(var(--muted))]'"
				class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--app-color-text)]"
				role="option"
				@mouseenter="activeIndex = index"
				@mousedown.prevent="selectSuggestion(suggestion)"
			>
				<span class="min-w-0 truncate font-semibold">{{ suggestion.title }}</span>
				<span class="flex shrink-0 items-center gap-2 text-xs text-[var(--app-color-text-muted)]">
					{{ suggestion.releaseYear }}
					<Check v-if="displayValue === suggestion.title" class="size-4 text-[var(--app-color-accent)]" />
				</span>
			</li>
		</ul>
	</div>
</template>
