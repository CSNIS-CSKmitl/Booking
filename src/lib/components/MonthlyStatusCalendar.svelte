<script lang="ts">
	import { page } from "$app/state";
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { cn } from "$lib/utils";
	import { fade, slide } from "svelte/transition";
	import { toast } from "svelte-sonner";

	interface BookingDisplayItem {
		id: string;
		title: string;
		time: string;
		roomName: string;
		bookerName?: string;
		bookerEmail?: string;
		detailLabel?: string;
	}

	interface CalendarDay {
		dateKey: string;
		dayNumber: number;
		isCurrentMonth: boolean;
		isToday: boolean;
		bookings: BookingDisplayItem[];
	}

	interface Props {
		calendarDays?: CalendarDay[];
		isAdmin?: boolean;
	}

	let { calendarDays = [], isAdmin = false }: Props = $props();
	const user = $derived(page.data.user);

	const daysOfWeek = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

	// Dialog / Edit States
	let selectedBooking = $state<BookingDisplayItem | null>(null);
	let isEditing = $state(false);
	let editBookerName = $state("");
	let isSaving = $state(false);
	let isDeleting = $state(false);

	function openDetails(booking: BookingDisplayItem) {
		selectedBooking = booking;
		isEditing = false;
		editBookerName = booking.bookerName || "";
	}

	async function handleSaveBookerName() {
		if (!selectedBooking) return;
		isSaving = true;
		try {
			const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bookerName: editBookerName }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "แก้ไขชื่อผู้จองไม่สำเร็จ");
			}
			toast.success("แก้ไขชื่อผู้จองเรียบร้อยแล้ว");
			selectedBooking.bookerName = editBookerName;
			isEditing = false;
			// Reload page to refresh calendar data
			window.location.reload();
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "แก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
		} finally {
			isSaving = false;
		}
	}

	async function handleDeleteBooking() {
		if (!selectedBooking) return;
		if (
			!confirm(
				`คุณต้องการยกเลิกการจอง "${selectedBooking.title}" ใช่หรือไม่?`,
			)
		)
			return;
		isDeleting = true;
		try {
			const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "ยกเลิกการจองไม่สำเร็จ");
			}
			toast.success("ยกเลิกการจองเรียบร้อยแล้ว");
			selectedBooking = null;
			// Reload page to refresh calendar data
			window.location.reload();
		} catch (err: any) {
			console.error(err);
			toast.error(err.message || "ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
		} finally {
			isDeleting = false;
		}
	}
</script>


<Card.Root class="gap-0 overflow-hidden p-0 border border-border bg-card shadow-xs rounded-xl">
	<div class="overflow-x-auto overscroll-x-contain">
		<div class="min-w-[840px]">
	<!-- Day-of-week header -->
	<div
		class="border-border bg-muted/40 grid grid-cols-7 border-b"
	>
		{#each daysOfWeek as day}
			<div
				class="text-foreground/80 py-4.5 text-center text-sm font-bold tracking-wider font-['Prompt',sans-serif]"
			>
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar Grid of Cells -->
	<div class="grid grid-cols-7 divide-x divide-y divide-border/50 border-t border-l border-border/50">
		{#each calendarDays as day, i (day.dateKey)}
			<div
				class={cn(
					"group flex min-h-[160px] md:min-h-[185px] flex-col gap-2 p-4 transition-colors duration-250 relative",
					day.isCurrentMonth
						? "bg-card"
						: "bg-muted/30",
					day.isToday &&
						"bg-indigo-50/20 dark:bg-indigo-950/10 ring-1 ring-indigo-600/20 z-10",
					"hover:bg-accent/40",
				)}
			>
				<!-- Day Header inside cell -->
				<div class="flex items-center justify-between mb-0.5">
					{#if day.isToday}
						<Badge
							class="h-7 min-w-7 text-xs font-bold justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white tabular-nums px-1.5 shadow-sm shadow-indigo-500/20"
						>
							{day.dayNumber}
						</Badge>
					{:else}
						<span
							class={cn(
								"inline-flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
								day.isCurrentMonth
									? "text-foreground"
									: "text-foreground/20",
							)}
						>
							{day.dayNumber}
						</span>
					{/if}

					<!-- Small point when there is any booking in cell -->
					{#if day.bookings.length > 0 && day.isCurrentMonth}
						<span
							class="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
							title="{day.bookings.length} รายการจอง"
						></span>
					{/if}
				</div>

				<!-- Bookings Schedule List -->
				<div class="flex flex-1 flex-col gap-1.5 overflow-hidden">
					{#if day.isCurrentMonth && day.bookings.length > 0}
						{#each day.bookings.slice(0, 3) as booking (booking.id)}
							<button
								type="button"
								onclick={() => openDetails(booking)}
								class="w-full bg-muted hover:bg-muted/80 dark:bg-muted dark:hover:bg-accent border border-border/50 rounded px-2.5 py-1.5 text-left transition-colors duration-150 cursor-pointer select-none"
							>
								<p
									class="truncate text-sm leading-normal text-foreground font-['Prompt',sans-serif]"
								>
									{booking.title}
								</p>
								<p
									class="text-foreground/70 mt-0.5 truncate font-mono text-sm font-medium leading-tight"
								>
									{booking.time}
								</p>
							</button>
						{/each}
						{#if day.bookings.length > 3}
							<div
								class="text-foreground/60 text-[9px] font-bold pl-1 mt-0.5 tracking-wider uppercase"
							>
								+ {day.bookings.length - 3} คิวเพิ่มเติม
							</div>
						{/if}
					{:else if day.isCurrentMonth}
						<div
							class="text-foreground/20 hidden flex-1 items-center justify-center text-[10px] font-bold tracking-wider uppercase md:flex"
						>
							ว่าง
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
		</div>
	</div>
</Card.Root>

<!-- ============ DETAILS DIALOG MODAL ============ -->
{#if selectedBooking}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
		onclick={() => (selectedBooking = null)}
		transition:fade={{ duration: 150 }}
	>
		<div
			class="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
			onclick={(e) => e.stopPropagation()}
			transition:slide={{ duration: 200 }}
		>
			<!-- Modal Header -->
			<div
				class="px-6 py-4 border-b border-border/85 flex items-center justify-between bg-muted/50"
			>
				<h3
					class="font-bold text-foreground text-sm tracking-wide uppercase font-['Prompt',sans-serif]"
				>
					รายละเอียดการจองห้อง
				</h3>
				<button
					type="button"
					onclick={() => (selectedBooking = null)}
					class="text-foreground/50 hover:text-foreground cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
				>
					✕
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 space-y-4 text-xs font-['Prompt',sans-serif]">
				<div class="space-y-1">
					<span
						class="text-[10px] font-bold uppercase tracking-wider text-foreground/55"
						>หัวข้อการประชุม</span
					>
					<p class=" text-foreground text-base">
						{selectedBooking.title}
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1">
						<span
							class="text-[10px] uppercase tracking-wider text-foreground/55"
							>เวลาการใช้งาน</span
						>
						<p class="text-foreground font-mono font-medium">
							{selectedBooking.time}
						</p>
					</div>

					<div class="space-y-1">
						<span
							class="text-[10px] uppercase tracking-wider text-foreground/55"
							>สถานที่ / ห้อง</span
						>
						<p class="text-foreground font-medium">
							{selectedBooking.roomName}
						</p>
					</div>
				</div>

				<!-- Booker Info / Edit Booker Name -->
				<div
					class="space-y-1.5 border-t border-border/60 pt-4"
				>
					<span
						class="text-[14px] uppercase tracking-wider text-foreground/55 flex items-center justify-between"
					>
						<span>ผู้จองห้อง</span>
						{#if isAdmin && !isEditing}
							<button
								type="button"
								onclick={() => (isEditing = true)}
								class="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-[14px]"
							>
								แก้ไขชื่อ
							</button>
						{/if}
					</span>

					{#if isEditing}
						<div
							class="flex gap-2 items-center mt-1"
							transition:slide
						>
							<input
								type="text"
								bind:value={editBookerName}
								placeholder="ระบุชื่อผู้จองใหม่"
								class="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 font-medium text-xs"
							/>
							<button
								type="button"
								onclick={handleSaveBookerName}
								disabled={isSaving}
								class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs cursor-pointer"
							>
								{isSaving ? "บันทึก..." : "บันทึก"}
							</button>
							<button
								type="button"
								onclick={() => {
									isEditing = false;
									editBookerName =
										selectedBooking?.bookerName || "";
								}}
								class="px-3 py-1.5 border border-border text-foreground/70 rounded-lg font-medium text-xs cursor-pointer"
							>
								ยกเลิก
							</button>
						</div>
					{:else}
						<p class="text-foreground font-medium text-xs">
							{selectedBooking.bookerName || "ไม่ได้ระบุ"}
							{#if selectedBooking.bookerEmail}
								<span
									class="font-mono text-[10px] text-foreground/50 font-normal flex-wrap"
									>({selectedBooking.bookerEmail})</span
								>
							{/if}
						</p>
					{/if}
				</div>

				{#if selectedBooking.detailLabel}
					<div
						class="space-y-1 border-t border-border/60 pt-4"
					>
						<span
							class="text-[10px] font-bold uppercase tracking-wider text-foreground/55"
							>รายละเอียดเพิ่มเติม</span
						>
						<p
							class="text-foreground/90 whitespace-pre-wrap font-medium"
						>
							{selectedBooking.detailLabel}
						</p>
					</div>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div
				class="px-6 py-4 border-t border-border/85 bg-muted/50 flex items-center justify-between"
			>
				<div>
					{#if isAdmin || (user && selectedBooking.bookerEmail === user.email)}
						<button
							type="button"
							onclick={handleDeleteBooking}
							disabled={isDeleting}
							class="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none"
						>
							{isDeleting ? "กำลังยกเลิก..." : "ยกเลิกการจองนี้"}
						</button>
					{/if}
				</div>
				<button
					type="button"
					onclick={() => (selectedBooking = null)}
					class="px-4 py-2 border border-border hover:bg-accent transition-colors text-foreground/80 rounded-lg text-xs font-bold cursor-pointer"
				>
					ปิดหน้าต่าง
				</button>
			</div>
		</div>
	</div>
{/if}
