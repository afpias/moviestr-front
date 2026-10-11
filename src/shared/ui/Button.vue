<script setup lang="ts">
import { cva } from 'class-variance-authority'
import type { HTMLAttributes } from 'vue'

import { cn } from '@shared/lib/utils'

interface ButtonProps {
	class?: HTMLAttributes['class']
	size?: 'default' | 'icon' | 'large'
	variant?: 'default' | 'ghost' | 'outline'
}

const props = withDefaults(defineProps<ButtonProps>(), {
	size: 'default',
	variant: 'default'
})

const buttonVariants = cva(
	'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[calc(var(--radius)*0.75)] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[hsl(var(--ring)/0.35)] disabled:pointer-events-none disabled:opacity-55',
	{
		variants: {
			variant: {
				default:
					'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_8px_24px_var(--app-color-accent-shadow)] hover:bg-[var(--app-color-accent-hover)]',
				ghost: 'bg-transparent text-[var(--app-color-text)] hover:bg-[var(--app-color-surface-raised)]',
				outline:
					'border border-[var(--app-color-border)] bg-transparent text-[var(--app-color-text)] hover:bg-[var(--app-color-surface-raised)]'
			},
			size: {
				default: 'h-11',
				icon: 'size-11 p-0',
				large: 'h-13 px-6 text-base'
			}
		},
		defaultVariants: {
			size: 'default',
			variant: 'default'
		}
	}
)
</script>

<template>
	<button :class="cn(buttonVariants({ size: props.size, variant: props.variant }), props.class)" type="button">
		<slot />
	</button>
</template>
