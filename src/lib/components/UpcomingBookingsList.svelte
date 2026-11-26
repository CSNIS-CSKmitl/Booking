<script lang="ts">
	import { Users, CalendarDays, Clock, MapPin } from "@lucide/svelte";
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import type { BookingItem } from "$lib/types";

	interface Props {
		upcomingBookings?: BookingItem[];
		roomLocation?: string;
	}

	let { upcomingBookings = [], roomLocation = "" }: Props = $props();
</script>

<Card.Root
	class="border-border bg-card p-5 rounded-xl flex flex-col gap-4 shadow-xs"
>
	<Card.Header class="p-0 flex flex-row items-center justify-between">
		<h3
			class="text-muted-foreground text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 font-['IBM_Plex_Sans_Thai',sans-serif]"
		>
			<CalendarDays class="h-4 w-4 text-muted-foreground" />
			คิวถัดไปในวันนี้
		</h3>
		{#if upcomingBookings.length > 0}
			<Badge
				variant="secondary"
				class="bg-muted text-foreground/80 border border-border text-[10px] font-bold"
			>
				{upcomingBookings.length} คิว
			</Badge>
		{/if}
	</Card.Header>

	<Card.Content
		class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-0 pr-1 max-h-[300px]"
	>
		{#if upcomingBookings.length > 0}
			<div class="space-y-3">
				{#each upcomingBookings as booking (booking.id)}
					<div
						class="bg-muted/40 border border-border hover:bg-accent/40 transition-colors duration-200 flex items-center justify-between gap-4 rounded-lg px-4 py-3"
					>
						<div class="min-w-0 flex-1 space-y-1">
							<p
								class="truncate text-sm font-bold text-foreground font-['IBM_Plex_Sans_Thai',sans-serif] tracking-tight"
							>
								{booking.title}
							</p>
							<div
								class="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground"
							>
								{#if roomLocation}
									<div class="flex items-center gap-1">
										<MapPin class="h-3 w-3 text-muted-foreground" />
										<span class="truncate"
											>{roomLocation}</span
										>
									</div>
								{/if}
								{#if booking.bookerName || booking.bookerEmail || booking.booker_email}
									<div class="flex items-center gap-1">
										<Users class="h-3 w-3 text-muted-foreground" />
										<span class="truncate">
											{booking.bookerName ||
												booking.bookerEmail ||
												booking.booker_email}
										</span>
									</div>
								{/if}
							</div>
						</div>
						<div class="flex flex-col items-end">
							<Badge
								variant="outline"
								class="border-border bg-background text-muted-foreground font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
							>
								<Clock class="h-3.5 w-3.5" />
								{booking.startTime} - {booking.endTime}
							</Badge>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="border-border border-dashed bg-muted/50 rounded-lg border-2 px-4 py-10 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-1.5"
			>
				<CalendarDays class="h-6 w-6 text-muted-foreground" />
				<p class="font-semibold text-foreground/80">
					ไม่มีรายการจองถัดไปในวันนี้
				</p>
				<p class="text-muted-foreground">
					ห้องว่างสำหรับช่วงเวลาที่เหลือ
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
