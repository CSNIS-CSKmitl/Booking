<script lang="ts">
	import { onMount } from "svelte";
	import { env } from "$env/dynamic/public";
	import RoomHeader from "$lib/components/RoomHeader.svelte";
	import ActiveBookingCard from "$lib/components/ActiveBookingCard.svelte";
	import UpcomingBookingsList from "$lib/components/UpcomingBookingsList.svelte";
	import QrBookingCard from "$lib/components/QrBookingCard.svelte";
	import { page } from "$app/state";

	// Import Svelte 5 Flow Controller
	import { RoomFlow } from "$lib/components/room/RoomFlow.svelte";

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";
	const currentRoomId = page.params.roomId;
	const defaultRoomName = "CONFERENCE ROOM 01";
	const defaultRoomLocation = "อาคารอเนกประสงค์ ชั้น 3";
	const defaultBookingUrl = "https://example.com/book-room";

	const flow = new RoomFlow();

	onMount(() => {
		let destroyed = false;
		flow.updateClock(currentRoomId ?? "");
		const clockTimer = window.setInterval(
			() => flow.updateClock(currentRoomId ?? ""),
			1000,
		);

		void flow.initRealtimeSystem(
			currentRoomId ?? "",
			pocketbaseUrl,
			defaultRoomName,
			defaultRoomLocation,
			defaultBookingUrl,
			() => destroyed,
		);

		return () => {
			destroyed = true;
			window.clearInterval(clockTimer);
			const t = (window as any).__roomPollTimer;
			if (t) {
				window.clearInterval(t);
				(window as any).__roomPollTimer = null;
			}
		};
	});
</script>

<svelte:head>
	<title>{flow.roomName} | Panel Display</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div
	class="min-h-screen w-full bg-background text-foreground font-['Inter','Prompt',sans-serif] antialiased transition-colors duration-300"
>
	<div
		class="mx-auto flex min-h-screen max-w-[1300px] flex-col gap-6 px-6 py-6 md:px-10 md:py-8"
	>
		<!-- 1. Header -->
		<RoomHeader
			roomName={flow.roomName}
			roomLocation={flow.roomLocation}
			clockText={flow.clockText}
			dateText={flow.dateText}
			statusLabel={flow.statusLabel}
		/>

		<!-- 2. Main Grid Layout -->
		<main
			class="grid flex-1 min-h-0 gap-6 grid-cols-1 md:grid-cols-[1.6fr_0.7fr] items-start"
		>
			<!-- Left column: Active Booking Card & Queue List -->
			<div class="flex flex-col gap-6 min-h-0">
				{#if flow.loading}
					<div class="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4 animate-pulse" aria-busy="true" aria-label="กำลังโหลดสถานะห้อง">
						<div class="flex items-center justify-between">
							<div class="h-5 w-28 rounded bg-muted"></div>
							<div class="h-5 w-24 rounded bg-muted"></div>
						</div>
						<div class="h-8 w-2/3 rounded bg-muted"></div>
						<div class="flex gap-4">
							<div class="h-4 w-32 rounded bg-muted"></div>
							<div class="h-4 w-28 rounded bg-muted"></div>
						</div>
						<div class="pt-4 space-y-2">
							<div class="flex justify-between">
								<div class="h-3 w-24 rounded bg-muted"></div>
								<div class="h-3 w-10 rounded bg-muted"></div>
							</div>
							<div class="h-1.5 w-full rounded-full bg-muted"></div>
						</div>
					</div>
					<div class="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 animate-pulse">
						<div class="h-4 w-32 rounded bg-muted"></div>
						{#each Array(3) as _, idx (idx)}
							<div class="rounded-lg border border-border/70 bg-muted/30 p-3.5 flex items-center justify-between gap-4">
								<div class="flex-1 space-y-2">
									<div class="h-4 w-1/2 rounded bg-muted"></div>
									<div class="h-3 w-1/3 rounded bg-muted"></div>
								</div>
								<div class="h-6 w-24 rounded bg-muted"></div>
							</div>
						{/each}
					</div>
				{:else}
					<ActiveBookingCard
						bookingViewState={flow.bookingViewState}
						currentBooking={flow.currentBooking}
						progressNote={flow.progressNote}
						progressPercent={flow.progressPercent}
					/>
					<UpcomingBookingsList
						upcomingBookings={flow.upcomingBookings}
						roomLocation={flow.roomLocation}
					/>
				{/if}
			</div>

			<!-- Right column: QR Booking Widget -->
			<div class="md:sticky md:top-12">
				<QrBookingCard qrCodeDataUrl={flow.qrCodeDataUrl} />
			</div>
		</main>
	</div>
</div>

<style>
	@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap");
</style>
