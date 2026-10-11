<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'

import { X } from '@lucide/vue'

interface DialogProps {
	closable?: boolean
	description?: string
	open: boolean
	title: string
}

const props = withDefaults(defineProps<DialogProps>(), {
	closable: true,
	description: undefined
})

const emit = defineEmits<{
	'update:open': [open: boolean]
}>()
</script>

<template>
	<DialogRoot :open="props.open" @update:open="emit('update:open', $event)">
		<DialogPortal>
			<DialogOverlay
				class="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
			/>
			<DialogContent
				class="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100vh-2rem)] w-[min(calc(100%-2rem),42rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-[var(--app-radius-large)] border border-[var(--app-color-border)] bg-[var(--app-color-surface-raised)] p-6 text-[var(--app-color-text)] shadow-[var(--app-shadow-large)] focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
				@escape-key-down="props.closable ? undefined : $event.preventDefault()"
				@pointer-down-outside="props.closable ? undefined : $event.preventDefault()"
			>
				<header class="grid gap-1.5 pr-8">
					<DialogTitle class="text-2xl font-extrabold tracking-[-0.04em]">{{ props.title }}</DialogTitle>
					<DialogDescription v-if="props.description" class="text-sm text-[var(--app-color-text-muted)]">
						{{ props.description }}
					</DialogDescription>
				</header>

				<slot />

				<footer v-if="$slots.footer" class="flex flex-wrap justify-end gap-2">
					<slot name="footer" />
				</footer>

				<DialogClose
					v-if="props.closable"
					class="absolute top-4 right-4 grid size-9 place-items-center rounded-md text-[var(--app-color-text-muted)] transition-colors hover:bg-[var(--app-color-surface)] hover:text-[var(--app-color-text)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[hsl(var(--ring)/0.35)]"
					aria-label="Закрыть диалог"
				>
					<X class="size-4" />
				</DialogClose>
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
