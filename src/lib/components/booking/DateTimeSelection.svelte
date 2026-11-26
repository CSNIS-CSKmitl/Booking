<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Calendar, Clock } from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import { slide } from "svelte/transition";

	let {
		bookingDate = $bindable(),
		startTime = $bindable(),
		endTime = $bindable(),
		isRecurring = $bindable(),
		recurringUntil = $bindable(),
		recurringDays = $bindable(),
		isAdmin,
		onToggleDay,
	}: {
		bookingDate: string;
		startTime: string;
		endTime: string;
		isRecurring: boolean;
		recurringUntil: string;
		recurringDays: number[];
		isAdmin: boolean;
		onToggleDay: (day: number) => void;
	} = $props();
</script>

<Card.Root
	class="border-border bg-card rounded-xl overflow-hidden shadow-xs"
>
	<Card.Header
		class="border-b border-border/80 px-6 py-4 flex items-center"
	>
		<div class="flex items-center gap-2">
			<span
				class="bg-indigo-600 text-white font-mono text-[10px] font-bold flex h-4.5 w-4.5 items-center justify-center rounded-full"
			>
				2
			</span>
			<Card.Title
				class="text-sm font-semibold tracking-wide uppercase text-foreground/80"
			>
				วันและเวลาที่ต้องการใช้ห้อง
			</Card.Title>
		</div>
	</Card.Header>

	<Card.Content class="p-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
		{#if !isRecurring}
			<div class="flex flex-col gap-1.5" transition:slide>
				<Label
					for="book-date"
					class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
				>
					<Calendar class="h-3.5 w-3.5 text-indigo-500" />
					วันที่
				</Label>
				<Input
					id="book-date"
					type="date"
					bind:value={bookingDate}
					class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
				/>
			</div>

			<div class="flex flex-col gap-1.5" transition:slide>
				<Label
					for="book-start"
					class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
				>
					<Clock class="h-3.5 w-3.5 text-emerald-500" />
					เวลาเริ่ม
				</Label>
				<Input
					id="book-start"
					type="time"
					bind:value={startTime}
					class="font-mono rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
				/>
			</div>

			<div class="flex flex-col gap-1.5" transition:slide>
				<Label
					for="book-end"
					class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
				>
					<Clock class="h-3.5 w-3.5 text-rose-500" />
					เวลาสิ้นสุด
				</Label>
				<Input
					id="book-end"
					type="time"
					bind:value={endTime}
					class="font-mono rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
				/>
			</div>
		{/if}

		{#if isAdmin}
			<div
				class="col-span-full border-t border-border/80 pt-5 mt-3"
			>
				<label class="flex items-start gap-3 cursor-pointer select-none">
					<div class="relative flex items-center mt-1">
						<input
							type="checkbox"
							bind:checked={isRecurring}
							class="sr-only peer"
						/>
						<div
							class="relative w-9 h-5 bg-muted peer-focus:outline-none dark:bg-muted rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-colors dark:border-border peer-checked:bg-indigo-600"
						></div>
					</div>
					<div class="flex flex-col">
						<span
							class="text-sm font-semibold text-foreground"
						>
							จองซ้ำทุกสัปดาห์ (Recurring Weekly Booking)
						</span>
						<span
							class="text-xs text-muted-foreground mt-0.5"
						>
							จองวันเดิมและช่วงเวลาเดิมซ้ำทุกสัปดาห์โดยอัตโนมัติ
							(เหมาะสำหรับการลงตารางเรียนสัมมนาของสัปเกรดการศึกษา)
						</span>
					</div>
				</label>

				{#if isRecurring}
					<div class="mt-4 flex flex-col gap-4" transition:slide>
						<!-- Dates Grid -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="flex flex-col gap-1.5">
								<Label
									for="book-date-start"
									class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
								>
									<Calendar class="h-3.5 w-3.5 text-indigo-500" />
									วันที่เริ่มต้น
								</Label>
								<Input
									id="book-date-start"
									type="date"
									bind:value={bookingDate}
									class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
								/>
							</div>

							<div class="flex flex-col gap-1.5">
								<Label
									for="recurring-until"
									class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
								>
									<Calendar class="h-3.5 w-3.5 text-indigo-500" />
									วันที่สิ้นสุด
								</Label>
								<Input
									id="recurring-until"
									type="date"
									bind:value={recurringUntil}
									min={bookingDate}
									class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
								/>
							</div>
						</div>

						<!-- Times Grid -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="flex flex-col gap-1.5">
								<Label
									for="book-start-recurring"
									class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
								>
									<Clock class="h-3.5 w-3.5 text-emerald-500" />
									เวลาเริ่ม
								</Label>
								<Input
									id="book-start-recurring"
									type="time"
									bind:value={startTime}
									class="font-mono rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
								/>
							</div>

							<div class="flex flex-col gap-1.5">
								<Label
									for="book-end-recurring"
									class="text-xs font-semibold flex items-center gap-1 text-muted-foreground"
								>
									<Clock class="h-3.5 w-3.5 text-rose-500" />
									เวลาสิ้นสุด
								</Label>
								<Input
									id="book-end-recurring"
									type="time"
									bind:value={endTime}
									class="font-mono rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
								/>
							</div>
						</div>

						<div class="flex flex-col gap-2.5">
							<span
								class="text-xs font-semibold text-muted-foreground"
							>
								เลือกวันในสัปดาห์ที่ต้องการจองซ้ำ
							</span>
							<div class="flex flex-wrap gap-2">
								{#each [
									{ label: "จ", name: "จันทร์", val: 1 },
									{ label: "อ", name: "อังคาร", val: 2 },
									{ label: "พ", name: "พุธ", val: 3 },
									{ label: "พฤ", name: "พฤหัสบดี", val: 4 },
									{ label: "ศ", name: "ศุกร์", val: 5 },
									{ label: "ส", name: "เสาร์", val: 6 },
									{ label: "อา", name: "อาทิตย์", val: 0 }
								] as d}
									<button
										type="button"
										onclick={() => onToggleDay(d.val)}
										class={cn(
											"h-10 px-3.5 rounded-lg border text-xs font-bold transition-colors duration-200 cursor-pointer select-none",
											recurringDays.includes(d.val)
												? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20"
												: "bg-background border-border text-muted-foreground hover:bg-accent"
										)}
										title={d.name}
									>
										{d.label}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
