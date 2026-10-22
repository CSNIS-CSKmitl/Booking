<script lang="ts">
	import AdminLink from './AdminLink.svelte';
	interface Props {
		roomName?: string;
		roomLocation?: string;
		clockText?: string;
		dateText?: string;
		statusLabel?: string;
	}

	let {
		roomName = '',
		roomLocation = '',
		clockText = '',
		dateText = '',
		statusLabel = ''
	}: Props = $props();

	// Simple status indicator color (no glow)
	const statusColorClass = $derived.by(() => {
		const label = (statusLabel ?? '').toUpperCase();
		if (label === 'LIVE') return 'bg-emerald-500';
		if (label === 'DEMO MODE') return 'bg-amber-500';
		return 'bg-rose-500';
	});
</script>

<header
	class="border-border flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b pb-4 pt-2 transition-all duration-300"
>
	<!-- Left section: Room details -->
	<div class="space-y-1">
		<h1
			class="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-['Prompt','Inter',sans-serif]"
		>
			{roomName}
		</h1>
		<div class="flex flex-wrap items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
			<span>{roomLocation}</span>
			<span class="inline-block h-1 w-1 rounded-full bg-muted-foreground/50"></span>
			<div class="flex items-center gap-1.5 bg-muted border border-border px-2 py-0.5 rounded-md">
				<span class="relative flex h-1.5 w-1.5">
					<span class="inline-flex h-1.5 w-1.5 rounded-full {statusColorClass}"></span>
				</span>
				<span class="font-mono font-bold text-[10px] tracking-wider text-muted-foreground uppercase">{statusLabel}</span>
			</div>
		</div>
	</div>

	<!-- Right section: Monospace clock -->
	<div class="flex flex-col items-start md:items-end text-foreground font-sans">
		<AdminLink />
		<div
			class="font-mono text-2xl md:text-3.5xl font-semibold tracking-tight text-foreground leading-none"
		>
			{clockText}
		</div>
		<div class="mt-1 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			{dateText}
		</div>
	</div>
</header>
