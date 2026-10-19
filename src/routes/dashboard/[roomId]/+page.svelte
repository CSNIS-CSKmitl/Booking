<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { env } from "$env/dynamic/public";
	import MonthlyStatusCalendar from "$lib/components/MonthlyStatusCalendar.svelte";
	import { Separator } from "$lib/components/ui/separator";

	// Import modular components
	import DashboardHeader from "$lib/components/dashboard/DashboardHeader.svelte";
	import DashboardControls from "$lib/components/dashboard/DashboardControls.svelte";

	// Import dashboard flow controller
	import { DashboardFlow } from "$lib/components/dashboard/DashboardFlow.svelte";

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";
	const user = $derived(page.data.user);
	const isAdmin = $derived(user?.isAdmin ?? false);

	const flow = new DashboardFlow();

	let currentRoomId = $derived(page.params.roomId);

	// Sync currentRoomId → flow.selectedRoomId
	$effect(() => {
		const rid = currentRoomId;
		if (rid) {
			flow.selectedRoomId = rid;
		}
	});

	// Clock update interval
	onMount(() => {
		flow.updateClock();
		const clockTimer = window.setInterval(() => flow.updateClock(), 1000);

		return () => {
			window.clearInterval(clockTimer);
		};
	});

	// Data fetching effect
	$effect(() => {
		const roomId = currentRoomId;
		const year = flow.selectedYear;
		const month = flow.selectedMonth;
		if (!roomId || !pocketbaseUrl) return;

		let cancelled = false;
		flow.calendarDays = [];

		(async () => {
			const success = await flow.fetchAndRender(roomId, pocketbaseUrl);
			if (!success || cancelled) return;

			const POLL_INTERVAL_MS = 30_000;
			const pollTimer = window.setInterval(async () => {
				if (cancelled) return;
				await flow.fetchAndRender(roomId, pocketbaseUrl);
			}, POLL_INTERVAL_MS);

			(window as any).__dashPollTimer = pollTimer;
		})();

		return () => {
			cancelled = true;
			const t = (window as any).__dashPollTimer;
			if (t) {
				window.clearInterval(t);
				(window as any).__dashPollTimer = null;
			}
		};
	});
</script>

<svelte:head>
	<title>ตาราง {flow.currentRoomName} | dashboard</title>
</svelte:head>

<div
	class="bg-background text-foreground min-h-screen w-screen font-['Inter','Prompt',sans-serif] antialiased"
>
	<div
		class="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-6 py-6 md:px-10 md:py-8"
	>
		<!-- ============ HEADER ============ -->
		<DashboardHeader
			displayMonthName={flow.displayMonthName}
			currentRoomName={flow.currentRoomName}
			clockText={flow.clockText}
			dateText={flow.dateText}
		/>

		<!-- ============ CONTROLS ============ -->
		<DashboardControls
			bind:selectedRoomId={flow.selectedRoomId}
			rawRooms={flow.rawRooms}
			bind:selectedMonth={flow.selectedMonth}
			bind:selectedYear={flow.selectedYear}
			monthNames={flow.monthNames}
			prevMonth={() => flow.prevMonth()}
			nextMonth={() => flow.nextMonth()}
			goToCurrentMonth={() => flow.goToCurrentMonth()}
			handleRoomChange={(val) => flow.handleRoomChange(val)}
		/>

		<Separator class="border-border" />

		<!-- ============ CALENDAR ============ -->
		<main class="flex-1">
			<MonthlyStatusCalendar calendarDays={flow.calendarDays} {isAdmin} />
		</main>
	</div>
</div>

<style>
	@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap");
</style>
