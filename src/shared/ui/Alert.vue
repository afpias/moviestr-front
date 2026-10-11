<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@shared/lib/utils'

interface AlertProps {
	class?: HTMLAttributes['class']
	variant?: 'default' | 'destructive' | 'warning'
}

const props = withDefaults(defineProps<AlertProps>(), {
	variant: 'default'
})
</script>

<template>
	<div
		:class="
			cn(
				'grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[var(--radius)] border p-4 text-sm',
				props.variant === 'destructive' &&
					'border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]',
				props.variant === 'warning' && 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200',
				props.variant === 'default' &&
					'border-[var(--app-color-border)] bg-[var(--app-color-surface)] text-[var(--app-color-text)]',
				props.class
			)
		"
	>
		<div class="mt-0.5 [&>svg]:size-4" aria-hidden="true">
			<slot name="icon" />
		</div>
		<div class="min-w-0 leading-relaxed">
			<slot />
		</div>
	</div>
</template>
