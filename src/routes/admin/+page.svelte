<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import BookingStats from '$lib/components/admin/BookingStats.svelte';
	import {
		computeBookingStats,
		filterBookingsByDrilldown,
		filterBookingsByTimeRange,
		type BookingDrilldownFilter,
		type BookingTimeRange
	} from '$lib/booking-stats';

	let { data, form }: { data: any; form: any } = $props();
	let roomName = $state('');
	let roomLocation = $state('');
	let selectedRange = $state<BookingTimeRange>('all');
	let activeFilter = $state<BookingDrilldownFilter>('all');
	let refreshing = $state(false);
	let refreshedAt = $state('');

	const statusText: Record<string, string> = {
		approved: 'อนุมัติแล้ว',
		confirmed: 'ยืนยันแล้ว',
		pending: 'รอดำเนินการ',
		cancelled: 'ยกเลิกแล้ว'
	};
	const statusClass: Record<string, string> = {
		approved: 'bg-emerald-100 text-emerald-700',
		confirmed: 'bg-emerald-100 text-emerald-700',
		pending: 'bg-amber-100 text-amber-700',
		cancelled: 'bg-slate-100 text-slate-500'
	};

	const computedStats = $derived(
		computeBookingStats({
			rooms: data.rooms ?? [],
			bookings: data.bookings ?? [],
			range: selectedRange
		})
	);

	const rangeBookings = $derived(filterBookingsByTimeRange(data.bookings ?? [], selectedRange));
	const filteredBookings = $derived(filterBookingsByDrilldown(rangeBookings, activeFilter));
	const effectiveLastUpdated = $derived(refreshedAt || data.lastUpdated || computedStats.generatedAt);

	function displayDate(value?: string) {
		return value
			? new Date(String(value).replace(' ', 'T')).toLocaleString('th-TH', {
					dateStyle: 'medium',
					timeStyle: 'short'
				})
			: '-';
	}

	async function handleRefresh() {
		refreshing = true;
		try {
			await invalidateAll();
			refreshedAt = new Date().toISOString();
		} finally {
			refreshing = false;
		}
	}

	async function cancel(id: string) {
		if (!confirm('ยืนยันยกเลิกการจองนี้หรือไม่')) return;
		const body = new FormData();
		body.set('bookingId', id);
		await fetch('?/cancel', { method: 'POST', body });
		await handleRefresh();
	}
</script>

<svelte:head><title>จัดการการจอง | Booking Admin</title></svelte:head>
<div class="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="text-xs font-bold uppercase tracking-widest text-indigo-600">Booking Admin</p>
				<h1 class="mt-1 text-2xl font-bold">จัดการการจองห้อง</h1>
			</div>
			<a class="rounded-lg border border-border px-4 py-2 text-sm" href="/">กลับหน้าหลัก</a>
		</div>

		{#if form?.message}
			<div class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{form.message}</div>
		{/if}

		<BookingStats
			stats={computedStats}
			{selectedRange}
			{activeFilter}
			loading={refreshing}
			error={data.statsError ?? ''}
			lastUpdated={effectiveLastUpdated}
			isRealtime={false}
			onRangeChange={(range) => (selectedRange = range)}
			onDrilldown={(filter) => (activeFilter = filter)}
			onRefresh={handleRefresh}
		/>

		<section class="rounded-xl border border-border bg-card p-4">
			<div class="mb-3">
				<h2 class="font-semibold">เพิ่มห้อง</h2>
				<p class="text-xs text-muted-foreground">ห้องใหม่จะแสดงในหน้าจองทันทีหลังบันทึก</p>
			</div>
			<form
				method="POST"
				action="?/createRoom"
				class="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
			>
				<label class="grid gap-1 text-sm">
					<span>ชื่อห้อง <span class="text-rose-600">*</span></span>
					<input
						name="name"
						bind:value={roomName}
						required
						maxlength="120"
						class="h-10 rounded-lg border border-input bg-background px-3"
						placeholder="เช่น Lab3"
					/>
				</label>
				<label class="grid gap-1 text-sm">
					<span>สถานที่</span>
					<input
						name="location"
						bind:value={roomLocation}
						maxlength="160"
						class="h-10 rounded-lg border border-input bg-background px-3"
						placeholder="เช่น อาคารวิศวกรรม ชั้น 7"
					/>
				</label>
				<button
					type="submit"
					class="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
				>
					เพิ่มห้อง
				</button>
			</form>
		</section>

		<div class="rounded-xl border border-border bg-card p-4">
			<h2 class="mb-3 font-semibold">ห้องทั้งหมด (คลิกเพื่อกรองตารางการจอง)</h2>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.rooms as room (room.id)}
					{@const roomFilter = `room:${room.id}` as const}
					<button
						type="button"
						class="rounded-lg border px-3 py-2 text-left transition {activeFilter === roomFilter
							? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
							: 'border-border/70 hover:border-indigo-300'}"
						onclick={() => (activeFilter = activeFilter === roomFilter ? 'all' : roomFilter)}
					>
						<p class="font-medium">{room.name}</p>
						<p class="text-xs text-muted-foreground">{room.location || 'ไม่ระบุสถานที่'}</p>
					</button>
				{:else}
					<p class="text-sm text-muted-foreground">ยังไม่มีห้อง</p>
				{/each}
			</div>
		</div>

		<!-- Bookings Table with Filter Pills -->
		<div class="overflow-hidden rounded-xl border border-border bg-card">
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
				<div class="flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						class="rounded-lg px-3 py-1 text-xs font-semibold transition {activeFilter === 'all'
							? 'bg-slate-800 text-white'
							: 'bg-muted/60 text-muted-foreground hover:bg-muted'}"
						onclick={() => (activeFilter = 'all')}
					>
						ทั้งหมด ({rangeBookings.length})
					</button>
					<button
						type="button"
						class="rounded-lg px-3 py-1 text-xs font-semibold transition {activeFilter === 'active'
							? 'bg-emerald-600 text-white'
							: 'bg-muted/60 text-muted-foreground hover:bg-muted'}"
						onclick={() => (activeFilter = 'active')}
					>
						กำลังใช้งาน ({computedStats.active})
					</button>
					<button
						type="button"
						class="rounded-lg px-3 py-1 text-xs font-semibold transition {activeFilter === 'upcoming'
							? 'bg-amber-600 text-white'
							: 'bg-muted/60 text-muted-foreground hover:bg-muted'}"
						onclick={() => (activeFilter = 'upcoming')}
					>
						กำลังจะมาถึง ({computedStats.upcoming})
					</button>
					<button
						type="button"
						class="rounded-lg px-3 py-1 text-xs font-semibold transition {activeFilter === 'cancelled'
							? 'bg-rose-600 text-white'
							: 'bg-muted/60 text-muted-foreground hover:bg-muted'}"
						onclick={() => (activeFilter = 'cancelled')}
					>
						ยกเลิกแล้ว ({computedStats.cancelled})
					</button>
				</div>
				<span class="text-xs text-muted-foreground">แสดง {filteredBookings.length} รายการ</span>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[980px] text-left text-sm">
					<thead class="border-b border-border bg-muted/40 text-xs text-muted-foreground">
						<tr>
							<th class="px-4 py-3">หัวข้อ</th>
							<th class="px-4 py-3">ห้อง</th>
							<th class="px-4 py-3">วันเวลา</th>
							<th class="px-4 py-3">ผู้จอง</th>
							<th class="px-4 py-3">สถานะ</th>
							<th class="px-4 py-3 text-right">จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredBookings as booking (booking.id)}
							<tr class="border-b border-border/60 last:border-0">
								<td class="px-4 py-3 font-medium">{booking.title}</td>
								<td class="px-4 py-3">
									{booking.roomName}{booking.location ? ` (${booking.location})` : ''}
								</td>
								<td class="px-4 py-3 whitespace-nowrap text-muted-foreground">
									{displayDate(booking.start_time)}<br />ถึง {displayDate(booking.end_time)}
								</td>
								<td class="px-4 py-3">
									{booking.bookerName || '-'}<br />
									<span class="text-xs text-muted-foreground">{booking.bookerEmail}</span>
								</td>
								<td class="px-4 py-3">
									<span
										class={`rounded-full px-2 py-1 text-xs font-medium ${statusClass[booking.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}
									>
										{statusText[booking.status ?? ''] ?? booking.status ?? '-'}
									</span>
								</td>
								<td class="px-4 py-3 text-right">
									{#if booking.status !== 'cancelled'}
										<button
											class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
											onclick={() => booking.id && cancel(booking.id)}
										>
											ยกเลิก
										</button>
									{:else}
										<span class="text-xs text-muted-foreground">-</span>
									{/if}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-4 py-12 text-center text-muted-foreground">
									ไม่มีข้อมูลการจองในตัวกรองที่เลือก
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
