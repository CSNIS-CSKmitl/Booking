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
	class="min-h-screen w-screen bg-background text-foreground font-['IBM_Plex_Sans_Thai','Inter',sans-serif] antialiased transition-colors duration-300"
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
			</div>

			<!-- Right column: QR Booking Widget -->
			<div class="lg:sticky md:top-12">
				<QrBookingCard qrCodeDataUrl={flow.qrCodeDataUrl} />
			</div>
		</main>
	</div>
</div>

<style>
	@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap");
</style>
