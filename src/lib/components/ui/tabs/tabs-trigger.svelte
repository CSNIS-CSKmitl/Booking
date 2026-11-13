<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: TabsPrimitive.TriggerProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	class={cn(
		'data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:ring-ring/50 inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</TabsPrimitive.Trigger>
