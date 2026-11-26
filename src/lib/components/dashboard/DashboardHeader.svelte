<script lang="ts">
	import AdminLink from '../AdminLink.svelte';
	import type { Room } from '$lib/types';
	import { MapPin, Users, X } from '@lucide/svelte';

	let {
		displayMonthName,
		currentRoomName,
		currentRoom,
		clockText,
		dateText,
	}: {
		displayMonthName: string;
		currentRoomName: string;
		currentRoom?: Room;
		clockText: string;
		dateText: string;
	} = $props();

	let previewOpen = $state(false);
	let imgFailed = $state(false);
	let imgLoaded = $state(false);

	$effect(() => {
		currentRoom?.image_url;
		imgFailed = false;
		imgLoaded = false;
		previewOpen = false;
	});
</script>

<div
	class="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"
>
	<div class="flex items-start gap-4">
		{#if currentRoom?.image_url && !imgFailed}
			<button
				type="button"
				onclick={() => (previewOpen = true)}
				class="group relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				title="คลิกเพื่อดูรูปห้องขนาดใหญ่"
			>
				{#if !imgLoaded}
					<div class="absolute inset-0 animate-pulse bg-muted"></div>
				{/if}
				<img
					src={currentRoom.image_url}
					alt={currentRoomName}
					loading="lazy"
					decoding="async"
					onload={() => (imgLoaded = true)}
					onerror={() => (imgFailed = true)}
					class="h-16 w-24 sm:h-20 sm:w-32 object-cover transition-all duration-200 group-hover:scale-105 {imgLoaded ? 'opacity-100' : 'opacity-0'}"
				/>
			</button>
		{/if}
		<div class="space-y-1">
			<div
				class="text-foreground/60 text-xs font-bold tracking-wider uppercase flex items-center gap-1"
			>
				Room Schedule · {displayMonthName}
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">
				{currentRoomName}
			</h1>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground/60 text-sm">
				<span>ตารางเวลาการจองใช้งานห้องประชุมรายเดือน</span>
				{#if currentRoom?.location}
					<span class="inline-flex items-center gap-1 text-xs text-foreground/70">
						<MapPin class="h-3.5 w-3.5" />
						{currentRoom.location}
					</span>
				{/if}
				{#if currentRoom?.seats}
					<span class="inline-flex items-center gap-1 text-xs text-foreground/70">
						<Users class="h-3.5 w-3.5" />
						{currentRoom.seats} ที่นั่ง
					</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex flex-col items-start gap-1 md:items-end">
		<AdminLink />
		<div
			class="font-mono text-xl md:text-2xl font-bold text-foreground leading-none"
		>
			{clockText}
		</div>
		<div
			class="text-foreground/45 text-[10px] md:text-xs font-semibold mt-0.5"
		>
			{dateText}
		</div>
	</div>
</div>

{#if previewOpen && currentRoom?.image_url}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
		onclick={() => (previewOpen = false)}
	>
		<div
			class="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				onclick={() => (previewOpen = false)}
				class="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 cursor-pointer"
				aria-label="ปิดรูปภาพ"
			>
				<X class="h-4 w-4" />
			</button>
			<img
				src={currentRoom.image_url}
				alt={currentRoomName}
				loading="lazy"
				decoding="async"
				class="max-h-[80vh] w-auto object-contain"
			/>
			<div class="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm">
				<span class="font-semibold text-foreground">{currentRoomName}</span>
				<span class="text-xs text-muted-foreground">
					{[currentRoom.location, currentRoom.seats ? `${currentRoom.seats} ที่นั่ง` : ''].filter(Boolean).join(' · ')}
				</span>
			</div>
		</div>
	</div>
{/if}
