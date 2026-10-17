<script lang="ts">
	import * as Select from "$lib/components/ui/select";
	import { Button } from "$lib/components/ui/button";
	import { CalendarPlus } from "@lucide/svelte";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import type { Room } from "$lib/types";

	let {
		selectedRoomId = $bindable(),
		rawRooms,
		selectedMonth = $bindable(),
		selectedYear = $bindable(),
		monthNames,
		prevMonth,
		nextMonth,
		goToCurrentMonth,
		handleRoomChange,
	}: {
		selectedRoomId: string;
		rawRooms: Room[];
		selectedMonth: number;
		selectedYear: number;
		monthNames: string[];
		prevMonth: () => void;
		nextMonth: () => void;
		goToCurrentMonth: () => void;
		handleRoomChange: (val: string | undefined) => void;
	} = $props();

	const selectedRoom = $derived(rawRooms.find((room) => room.id === selectedRoomId));
</script>

<div
	class="border border-border bg-card rounded-xl p-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xs"
>
	<!-- Room selector -->
	<div class="flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-3">
			<label
				for="room-select"
				class="text-foreground/70 text-xs font-bold tracking-wider uppercase font-['Prompt',sans-serif]"
			>
				เลือกห้อง:
			</label>

			<Select.Root
				bind:value={selectedRoomId}
				onValueChange={handleRoomChange}
			>
				<Select.Trigger
					id="room-select"
					class="w-[200px] rounded-lg border-border"
				>
					<Select.Value placeholder="กำลังโหลด...">
						{#if selectedRoom}
							{selectedRoom.name}{selectedRoom.location ? ` (${selectedRoom.location})` : ""}
						{:else}
							กำลังโหลด...
						{/if}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="rounded-lg shadow-lg">
					{#each rawRooms as room (room.id)}
						<Select.Item
							value={room.id}
							label={room.name}
							class="rounded-md cursor-pointer"
						>
							{room.name}{room.location ? ` (${room.location})` : ""}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<Button
			href="/book"
			class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
		>
			<CalendarPlus class="h-4 w-4 mr-2" />
			จองห้อง
		</Button>

		<!-- Month Navigator -->
		<div
			class="flex items-center gap-2 sm:border-l sm:border-border sm:pl-4"
		>
			<Button
				variant="outline"
				size="icon"
				onclick={prevMonth}
				class="h-9 w-9 rounded-lg border-border hover:bg-accent cursor-pointer"
				title="เดือนก่อนหน้า"
			>
				&lt;
			</Button>
			<span
				class="text-xs font-bold min-w-[130px] text-center text-foreground/80 font-['Prompt',sans-serif] uppercase tracking-wider"
			>
				{monthNames[selectedMonth]}
				{selectedYear + 543}
			</span>
			<Button
				variant="outline"
				size="icon"
				onclick={nextMonth}
				class="h-9 w-9 rounded-lg border-border hover:bg-accent cursor-pointer"
				title="เดือนถัดไป"
			>
				&gt;
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={goToCurrentMonth}
				class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer"
			>
				เดือนนี้
			</Button>
		</div>
	</div>
	<div class="flex items-center gap-3">
		<ThemeToggle />
	</div>
</div>
