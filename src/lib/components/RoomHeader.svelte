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
</script>

<header
	class="border-border flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b pb-4 pt-2 transition-colors duration-300"
>
	<!-- Left section: Room details -->
	<div class="space-y-1">
		<h1
			class="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-['IBM_Plex_Sans_Thai','Inter',sans-serif]"
		>
			{roomName}
		</h1>
		<div class="flex flex-wrap items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
			<span>{roomLocation}</span>
		</div>
	</div>

	<!-- Right section: Monospace clock -->
	<div class="flex flex-col items-start md:items-end text-foreground font-sans">
		<AdminLink />
		<div
			class="font-mono text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-none"
		>
			{clockText}
		</div>
		<div class="mt-1 text-[10px] md:text-xs font-semibold text-muted-foreground">
			{dateText}
		</div>
	</div>
</header>
