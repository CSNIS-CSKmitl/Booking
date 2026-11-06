<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Loader2, MapPin, Check, Users, DoorOpen } from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import type { Room } from "$lib/types";

	let {
		rooms,
		selectedRoomId,
		loadingRooms,
		onSelectRoom,
		getRoomName,
	}: {
		rooms: Room[];
		selectedRoomId: string;
		loadingRooms: boolean;
		onSelectRoom: (id: string) => void;
		getRoomName: (id: string) => string;
	} = $props();
</script>

<Card.Root
	class="border-border bg-card rounded-xl overflow-hidden shadow-xs"
>
	<Card.Header
		class="border-b border-border/80 px-6 py-4 flex flex-row items-center justify-between"
	>
		<div class="flex items-center gap-2">
			<span
				class="bg-indigo-600 text-white font-mono text-[10px] font-bold flex h-4.5 w-4.5 items-center justify-center rounded-full"
			>
				1
			</span>
			<Card.Title
				class="text-sm font-semibold tracking-wide uppercase text-foreground/80"
			>
				เลือกห้องเรียน / ห้องประชุม
			</Card.Title>
		</div>
		{#if selectedRoomId}
			<Badge
				variant="outline"
				class="border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
			>
				เลือก: {getRoomName(selectedRoomId)}
			</Badge>
		{/if}
	</Card.Header>

	<Card.Content class="p-6">
		{#if loadingRooms}
			<div
				class="text-muted-foreground flex items-center justify-center py-6 gap-2 text-xs"
			>
				<Loader2 class="h-4 w-4 animate-spin text-indigo-600" />
				กำลังโหลดรายการห้อง...
			</div>
		{:else if rooms.length === 0}
			<div
				class="text-muted-foreground text-center py-6 text-xs italic"
			>
				ไม่พบห้องประชุมในขณะนี้
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
				{#each rooms as room (room.id)}
					<button
						type="button"
						onclick={() => onSelectRoom(room.id)}
						class={cn(
							"group relative rounded-xl border p-3.5 text-left transition-all duration-200 flex items-stretch gap-3.5 cursor-pointer overflow-hidden",
							selectedRoomId === room.id
								? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20 shadow-xs"
								: "border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-accent/40"
						)}
					>
						<!-- Room Image / Thumbnail -->
						<div class="relative h-20 w-24 sm:w-28 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/60">
							{#if room.image_url}
								<img
									src={room.image_url}
									alt={room.name}
									class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
									loading="lazy"
								/>
							{:else}
								<div class="flex h-full w-full items-center justify-center text-muted-foreground/40 bg-muted/60">
									<DoorOpen class="h-7 w-7" />
								</div>
							{/if}
						</div>

						<!-- Room Info -->
						<div class="flex min-w-0 flex-1 flex-col justify-between py-0.5">
							<div>
								<div class="flex items-start justify-between gap-1.5">
									<h3 class="text-sm font-bold tracking-tight text-foreground truncate">
										{room.name}
									</h3>
									<!-- Radio checkmark -->
									<div
										class={cn(
											"h-5 w-5 shrink-0 rounded-full flex items-center justify-center border text-[10px] transition-colors",
											selectedRoomId === room.id
												? "bg-indigo-600 border-indigo-600 text-white"
												: "border-border bg-background text-transparent"
										)}
									>
										{#if selectedRoomId === room.id}
											<Check class="h-3 w-3 stroke-[2.5]" />
										{/if}
									</div>
								</div>

								{#if room.location}
									<div class="text-muted-foreground flex items-center gap-1.5 mt-1 text-xs">
										<MapPin class="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
										<span class="truncate">{room.location}</span>
									</div>
								{/if}
							</div>

							<!-- Seats / Capacity -->
							<div class="flex items-center gap-2 mt-2 pt-1.5 border-t border-border/40">
								{#if room.seats != null && room.seats > 0}
									<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
										<Users class="h-3 w-3 shrink-0" />
										<span>{room.seats} ที่นั่ง</span>
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-[11px] text-muted-foreground/75">
										<Users class="h-3 w-3 shrink-0 opacity-50" />
										<span>ไม่ระบุที่นั่ง</span>
									</span>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
