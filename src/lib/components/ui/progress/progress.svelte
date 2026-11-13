<script lang="ts">
	import { Progress as ProgressPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		value = 0,
		max = 100,
		ref = $bindable(null),
		...restProps
	}: ProgressPrimitive.RootProps & { class?: string } = $props();
</script>

<ProgressPrimitive.Root
	bind:ref
	class={cn(
		'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
		className
	)}
	{value}
	{max}
	{...restProps}
>
	<div
		class="bg-primary h-full w-full flex-1 transition-colors"
		style="transform: translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
	></div>
</ProgressPrimitive.Root>