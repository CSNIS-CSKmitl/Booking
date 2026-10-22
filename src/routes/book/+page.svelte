<script lang="ts">
	import { onMount, untrack } from "svelte";
	import PocketBase from "pocketbase";
	import { env } from "$env/dynamic/public";
	import { page } from "$app/state";
	import Topbar from "$lib/components/Topbar.svelte";
	import { authenticatePbFromCookie } from "$lib/pocketbase";

	// Import modular components
	import RoomSelection from "$lib/components/booking/RoomSelection.svelte";
	import DateTimeSelection from "$lib/components/booking/DateTimeSelection.svelte";
	import BookingDetailsForm from "$lib/components/booking/BookingDetailsForm.svelte";
	import QueueAside from "$lib/components/booking/QueueAside.svelte";
	import BookingSuccessState from "$lib/components/booking/BookingSuccessState.svelte";
	import BookingConfirmDialog from "$lib/components/booking/BookingConfirmDialog.svelte";

	// Import Svelte 5 Flow Controller
	import { BookingFlow } from "$lib/components/booking/BookingFlow.svelte";

	// Import UI components remaining in shell
	import {
		Alert,
		AlertTitle,
		AlertDescription,
	} from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { AlertCircle, Loader2, CalendarPlus } from "@lucide/svelte";

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";
	const user = $derived(page.data.user);
	const isAdmin = $derived(user?.isAdmin ?? false);

	// Instantiate Svelte 5 flow controller
	const flow = new BookingFlow(() => isAdmin);

	function getDayOfWeek(dateStr: string): number {
		if (!dateStr) return 1;
		try {
			return new Date(`${dateStr}T00:00:00`).getDay();
		} catch {
			return 1;
		}
	}

	$effect(() => {
		const dateVal = flow.bookingDate;
		untrack(() => {
			if (dateVal) {
				const day = getDayOfWeek(dateVal);
				if (!flow.recurringDays.includes(day)) {
					flow.recurringDays = [day];
				}
			}
		});
	});

	// re-fetch bookings when room or date changes
	$effect(() => {
		const rid = flow.selectedRoomId;
		const d = flow.bookingDate;
		untrack(() => {
			if (rid && d) {
				void flow.loadBookingsForSelected();
			}
		});
	});

	onMount(() => {
		if (pocketbaseUrl) {
			const pb = new PocketBase(pocketbaseUrl);
			authenticatePbFromCookie(pb);
			flow.init(pb);
		} else {
			flow.loadingRooms = false;
		}
	});
</script>

<svelte:head>
	<title>จองห้องประชุม | Booking</title>
</svelte:head>

<div
	class="bg-background text-foreground min-h-screen w-screen font-['Inter','Prompt',sans-serif] antialiased"
>
	<Topbar />

	<div class="mx-auto max-w-[1400px] px-6 py-6 md:px-10">
		<!-- Page Header: Simple & Professional -->
		<div
			class="flex flex-col gap-4 border-b border-border pb-6 mb-8 md:flex-row md:items-end md:justify-between"
		>
			<div class="space-y-1">
				<h1
					class="text-2xl font-bold tracking-tight text-foreground"
				>
					จองห้อง
				</h1>
				<p class="text-muted-foreground text-sm">
					เลือกห้องเรียน/ห้องประชุม ระบุวันเวลา
					และกรอกข้อมูลการจองใช้งาน
				</p>
			</div>
		</div>

		{#if flow.submitSuccess}
			<BookingSuccessState onReset={() => (flow.submitSuccess = false)} />
		{:else}
			<form
				onsubmit={(e) => flow.handleSubmit(e)}
				class="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
			>
				<!-- LEFT COLUMN: Form Steps -->
				<div class="flex flex-col gap-6">
					<!-- 1. Room Selection Step -->
					<RoomSelection
						rooms={flow.rooms}
						selectedRoomId={flow.selectedRoomId}
						loadingRooms={flow.loadingRooms}
						onSelectRoom={(id) => flow.selectRoom(id)}
						getRoomName={(id) => flow.getRoomName(id)}
					/>

					<!-- 2. Date & Time Step -->
					<DateTimeSelection
						bind:bookingDate={flow.bookingDate}
						bind:startTime={flow.startTime}
						bind:endTime={flow.endTime}
						bind:isRecurring={flow.isRecurring}
						bind:recurringUntil={flow.recurringUntil}
						bind:recurringDays={flow.recurringDays}
						{isAdmin}
						onToggleDay={(day) => flow.toggleDay(day)}
					/>

					<!-- 3. Details Step -->
					<BookingDetailsForm
						bind:title={flow.title}
						bind:notes={flow.notes}
						bind:advisorName={flow.advisorName}
						bind:customBookerName={flow.customBookerName}
						{isAdmin}
					/>

					<!-- Notifications & Validation alerts -->
					{#if flow.validationError}
						<Alert
							variant="destructive"
							class="border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg"
						>
							<AlertCircle class="h-4 w-4" />
							<AlertTitle class="font-semibold text-sm"
								>ระบุข้อมูลไม่ครบถ้วน</AlertTitle
							>
							<AlertDescription class="text-xs mt-0.5"
								>{flow.validationError}</AlertDescription
							>
						</Alert>
					{/if}

					{#if flow.submitError}
						<Alert
							variant="destructive"
							class="border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg"
						>
							<AlertCircle class="h-4 w-4" />
							<AlertTitle class="font-semibold text-sm"
								>การส่งคำขอจองล้มเหลว</AlertTitle
							>
							<AlertDescription class="text-xs mt-0.5"
								>{flow.submitError}</AlertDescription
							>
						</Alert>
					{/if}

					<Button
						type="submit"
						disabled={flow.submitting}
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg shadow-xs transition-colors duration-200 cursor-pointer"
					>
						{#if flow.submitting}
							<Loader2 class="h-4 w-4 animate-spin mr-2" />
							กำลังส่งคำขอจองห้อง...
						{:else}
							<CalendarPlus class="h-4 w-4 mr-2" />
							ส่งคำขอจองห้องประชุม
						{/if}
					</Button>
				</div>

				<!-- RIGHT COLUMN: Interactive Queue -->
				<QueueAside
					selectedRoomId={flow.selectedRoomId}
					bookingDate={flow.bookingDate}
					loadingBookings={flow.loadingBookings}
					existingBookings={flow.existingBookings}
				/>
			</form>
		{/if}
	</div>

	<BookingConfirmDialog
		bind:open={flow.showConfirm}
		roomName={flow.getRoomName(flow.selectedRoomId)}
		roomLocation={flow.getRoomLocation(flow.selectedRoomId)}
		date={flow.bookingDate}
		startTime={flow.startTime}
		endTime={flow.endTime}
		title={flow.title}
		notes={flow.notes}
		advisorName={flow.advisorName}
		isRecurring={flow.isRecurring}
		recurringUntil={flow.recurringUntil}
		recurringDaysText={flow.recurringDaysText}
		customBookerName={flow.customBookerName}
		submitting={flow.submitting}
		onConfirm={() => flow.executeSubmit()}
		onClose={() => (flow.showConfirm = false)}
	/>
</div>
