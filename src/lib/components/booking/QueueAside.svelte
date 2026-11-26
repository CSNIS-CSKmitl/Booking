<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { Loader2, MapPin, CheckCircle2, Clock, Users, FileText } from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import type { Booking } from "$lib/types";

	let {
		selectedRoomId,
		bookingDate,
		loadingBookings,
		existingBookings,
	}: {
		selectedRoomId: string;
		bookingDate: string;
		loadingBookings: boolean;
		existingBookings: Booking[];
	} = $props();

	function formatTime(iso: string): string {
		try {
			return new Date(iso.replace(" ", "T")).toLocaleTimeString("th-TH", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				hourCycle: "h23",
			});
		} catch {
			return iso;
		}
	}
</script>

<aside class="flex flex-col gap-4">
	<Card.Root
		class="sticky top-20 border-border bg-card rounded-xl overflow-hidden shadow-xs"
	>
		<Card.Header
			class="border-b border-border/80 px-6 py-4 flex flex-row items-center justify-between"
		>
			<Card.Title
				class="text-sm font-semibold tracking-wide uppercase text-foreground/80"
			>
				คิวการจองวันนี้
			</Card.Title>
			<Badge
				variant="outline"
				class="font-mono text-[10px] px-2 py-0.5"
			>
				{bookingDate}
			</Badge>
		</Card.Header>

		<Card.Content class="p-6">
			{#if !selectedRoomId}
				<div
					class="flex flex-col items-center justify-center text-center py-8 space-y-2"
				>
					<div
						class="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
					>
						<MapPin class="h-5 w-5" />
					</div>
					<p class="text-muted-foreground text-xs">
						โปรดเลือกห้องประชุมเพื่อเรียกดูตารางการจองวันนี้
					</p>
				</div>
			{:else if loadingBookings}
				<div class="space-y-3 py-1" aria-busy="true" aria-label="กำลังดึงรายการคิวจอง">
					{#each Array(3) as _, idx (idx)}
						<div class="rounded-lg border border-border/70 bg-muted/30 p-3.5 space-y-2.5 animate-pulse">
							<div class="flex items-center justify-between gap-2">
								<div class="h-4 w-24 rounded bg-muted"></div>
								<div class="h-4 w-14 rounded bg-muted"></div>
							</div>
							<div class="h-3.5 w-3/4 rounded bg-muted"></div>
							<div class="h-3 w-1/2 rounded bg-muted"></div>
						</div>
					{/each}
				</div>
			{:else if existingBookings.length === 0}
				<div
					class="border-border border-dashed bg-muted/40 rounded-lg border-2 px-4 py-10 text-center text-xs flex flex-col items-center justify-center space-y-1.5"
				>
					<CheckCircle2 class="h-6 w-6 text-emerald-500" />
					<p class="font-semibold text-foreground">
						ห้องว่างตลอดทั้งวัน
					</p>
					<p class="text-muted-foreground">
						สามารถเลือกเวลาใช้งานที่ต้องการได้ทันที
					</p>
				</div>
			{:else}
				<!-- Vertical Queue Timeline -->
				<div class="relative pl-5 space-y-4 py-1">
					<div
						class="absolute left-2 top-2 bottom-2 w-px bg-border"
					></div>

					{#each existingBookings as b (b.id)}
						<div class="relative">
							<!-- Simple status colored indicator dot -->
							<div
								class={cn(
									"absolute -left-[18px] top-1.5 h-2 w-2 rounded-full border bg-background",
									b.status === "pending"
										? "border-amber-500 bg-amber-500"
										: "border-emerald-500 bg-emerald-500"
								)}
							></div>

							<div
								class="bg-muted/40 border border-border/80 rounded-lg px-4 py-3"
							>
								<div
									class="flex items-center justify-between gap-2 mb-1"
								>
									<span
										class="font-mono text-[10px] font-bold text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded"
									>
										<Clock class="h-3 w-3 text-muted-foreground/75" />
										{formatTime(b.start_time)} - {formatTime(b.end_time)}
									</span>

									<Badge
										variant={b.status === "pending" ? "warning" : "success"}
										class="text-[8px] font-semibold px-1 rounded"
									>
										{b.status === "pending" ? "pending" : "approved"}
									</Badge>
								</div>

								<h4
									class="text-xs font-bold text-foreground line-clamp-1"
								>
									{b.title}
								</h4>

								<div class="mt-2 space-y-1 text-[10px]">
									{#if b.bookerName || b.bookerEmail || b.booker_email}
										<div
											class="text-muted-foreground flex items-center gap-1.5 truncate"
										>
											<Users class="h-3 w-3 text-muted-foreground/75" />
											<span class="truncate">
												{b.bookerName || b.bookerEmail || b.booker_email}
											</span>
										</div>
									{/if}

									{#if b.detailLabel}
										<div
											class="text-muted-foreground flex items-start gap-1.5 truncate"
										>
											<FileText class="h-3 w-3 text-muted-foreground/75" />
											<span class="truncate">{b.detailLabel}</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<Separator class="my-4 border-border/60" />
		</Card.Content>
	</Card.Root>
</aside>
