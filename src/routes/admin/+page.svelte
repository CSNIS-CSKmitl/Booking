<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import BookingStats from '$lib/components/admin/BookingStats.svelte';
	import { Trash2, Pencil } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
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

	
	
	let editingRoom = $state<{
		id: string;
		name: string;
		location: string;
		seats: number | null;
		image_url: string;
	} | null>(null);
	let editDialogOpen = $state(false);
	let editSaving = $state(false);

	function openEditRoom(room: any) {
		editingRoom = {
			id: room.id,
			name: room.name ?? '',
			location: room.location ?? '',
			seats: room.seats ?? null,
			image_url: room.image_url ?? ''
		};
		editDialogOpen = true;
	}

	async function handleSaveRoom(e: Event) {
		e.preventDefault();
		if (!editingRoom) return;
		editSaving = true;
		try {
			const body = new FormData();
			body.set('roomId', editingRoom.id);
			body.set('name', editingRoom.name);
			body.set('location', editingRoom.location);
			if (editingRoom.seats !== null && editingRoom.seats !== undefined && !isNaN(Number(editingRoom.seats))) {
				body.set('seats', String(editingRoom.seats));
			} else {
				body.set('seats', '');
			}
			body.set('image_url', editingRoom.image_url);

			await fetch('?/updateRoom', { method: 'POST', body });
			editDialogOpen = false;
			editingRoom = null;
			await handleRefresh();
		} finally {
			editSaving = false;
		}
	}
	async function handleDeleteRoom(id: string, name: string) {
		if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้อง "${name}"?\nการกระทำนี้จะลบห้องออกจากระบบและไม่สามารถย้อนกลับได้`)) return;
		const body = new FormData();
		body.set('roomId', id);
		await fetch('?/deleteRoom', { method: 'POST', body });
		if (activeFilter === `room:${id}`) {
			activeFilter = 'all';
		}
		await handleRefresh();
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

		<section class="rounded-xl border border-border bg-card p-4">
			<div class="mb-3">
				<h2 class="font-semibold">เพิ่มห้อง</h2>
				<p class="text-xs text-muted-foreground">ห้องใหม่จะแสดงในหน้าจองทันทีหลังบันทึก</p>
			</div>
			<form
				method="POST"
				action="?/createRoom"
				class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_1.5fr_auto] items-end"
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
				<label class="grid gap-1 text-sm">
					<span>จำนวนที่นั่ง</span>
					<input
						name="seats"
						type="number"
						min="0"
						class="h-10 rounded-lg border border-input bg-background px-3"
						placeholder="เช่น 40"
					/>
				</label>
				<label class="grid gap-1 text-sm">
					<span>URL รูปภาพ</span>
					<input
						name="image_url"
						type="url"
						class="h-10 rounded-lg border border-input bg-background px-3"
						placeholder="https://..."
					/>
				</label>
				<button
					type="submit"
					class="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap"
				>
					เพิ่มห้อง
				</button>
			</form>
		</section>

		<div class="rounded-xl border border-border bg-card p-4">
			<div class="flex items-center justify-between mb-3">
				<div>
					<h2 class="font-semibold">ห้องทั้งหมด ({data.rooms.length})</h2>
					<p class="text-xs text-muted-foreground">คลิกที่ห้องเพื่อกรองตารางการจอง หรือกดไอคอนถังขยะเพื่อลบห้อง</p>
				</div>
			</div>
			<div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.rooms as room (room.id)}
					{@const roomFilter = `room:${room.id}` as const}
					<div
						class="group relative flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all {activeFilter === roomFilter
							? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
							: 'border-border/70 hover:border-indigo-300 bg-card'}"
					>
						<button
							type="button"
							class="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
							onclick={() => (activeFilter = activeFilter === roomFilter ? 'all' : roomFilter)}
						>
							{#if room.image_url}
								<img src={room.image_url} alt="" class="h-10 w-10 shrink-0 rounded-lg object-cover border border-border" />
							{/if}
							<div class="min-w-0 flex-1">
								<p class="font-semibold text-sm truncate">{room.name}</p>
								<p class="text-xs text-muted-foreground truncate">
									{room.location || 'ไม่ระบุสถานที่'}
									{#if room.seats} • {room.seats} ที่นั่ง{/if}
								</p>
							</div>
						</button>
						<div class="flex items-center gap-1 shrink-0">
							<button
								type="button"
								class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
								title="แก้ไขห้องและจำนวนที่นั่ง {room.name}"
								onclick={(e) => {
									e.stopPropagation();
									openEditRoom(room);
								}}
							>
								<Pencil class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
								title="ลบห้อง {room.name}"
								onclick={(e) => {
									e.stopPropagation();
									handleDeleteRoom(room.id, room.name);
								}}
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground col-span-full py-4 text-center">ยังไม่มีห้องในระบบ</p>
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
								<td class="px-4 py-3 font-medium">
									{booking.title}
									{#if booking.advisorName}
										<p class="mt-1 text-xs font-normal text-muted-foreground">อาจารย์ที่ปรึกษา: {booking.advisorName}</p>
									{/if}
									{#if booking.detailLabel}
										<p class="mt-1 whitespace-pre-wrap break-words text-xs font-normal text-muted-foreground">หมายเหตุ: {booking.detailLabel}</p>
									{/if}
								</td>
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
									<p class="mt-2 text-xs text-muted-foreground">เพิ่มโดย: {booking.createdBy || '-'}<br />แก้ไขโดย: {booking.updatedBy || '-'}</p>
					{#if booking.approvedBy || booking.approvedAt}<p class="text-xs text-muted-foreground">อนุมัติโดย: {booking.approvedBy || 'ระบบ'}{booking.approvedAt ? ` · ${displayDate(booking.approvedAt)}` : ''}</p>{/if}
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
	</div>

<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="sm:max-w-[480px] bg-card border border-border rounded-2xl p-6 shadow-xl">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-lg font-bold flex items-center gap-2">
				<div class="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
					<Pencil class="h-4 w-4" />
				</div>
				แก้ไขข้อมูลห้อง / ที่นั่ง
			</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				ปรับปรุงชื่อห้อง สถานที่ จำนวนที่นั่ง หรือ URL รูปภาพ
			</Dialog.Description>
		</Dialog.Header>

		{#if editingRoom}
			<form onsubmit={handleSaveRoom} class="mt-4 space-y-4">
				<label class="grid gap-1.5 text-sm font-medium">
					<span>ชื่อห้อง <span class="text-rose-600">*</span></span>
					<input
						bind:value={editingRoom.name}
						required
						maxlength="120"
						class="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600"
						placeholder="เช่น Lab3"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-medium">
					<span>สถานที่</span>
					<input
						bind:value={editingRoom.location}
						maxlength="160"
						class="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600"
						placeholder="เช่น อาคารวิศวกรรม ชั้น 7"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-medium">
					<span>จำนวนที่นั่ง (ที่นั่ง) <span class="text-indigo-600 font-bold">*</span></span>
					<input
						type="number"
						min="0"
						bind:value={editingRoom.seats}
						class="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600"
						placeholder="เช่น 40"
					/>
				</label>

				<label class="grid gap-1.5 text-sm font-medium">
					<span>URL รูปภาพห้อง</span>
					<input
						type="url"
						bind:value={editingRoom.image_url}
						class="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600"
						placeholder="https://..."
					/>
				</label>

				{#if editingRoom.image_url}
					<div class="rounded-lg border border-border p-2 bg-muted/30 flex items-center gap-3">
						<img src={editingRoom.image_url} alt="Room preview" class="h-12 w-16 object-cover rounded border border-border" />
						<span class="text-xs text-muted-foreground truncate flex-1">ภาพตัวอย่างห้อง</span>
					</div>
				{/if}

				<div class="mt-6 flex justify-end gap-2 pt-3 border-t border-border">
					<button
						type="button"
						class="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
						onclick={() => (editDialogOpen = false)}
						disabled={editSaving}
					>
						ยกเลิก
					</button>
					<button
						type="submit"
						class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
						disabled={editSaving}
					>
						{editSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
					</button>
				</div>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
</div>