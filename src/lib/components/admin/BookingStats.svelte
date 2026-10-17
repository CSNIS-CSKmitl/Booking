<script lang="ts">
	import {
		BOOKING_TIME_RANGES,
		type BookingDrilldownFilter,
		type BookingTimeRange,
		type ComputedBookingStats
	} from '$lib/booking-stats';

	interface Props {
		stats: Partial<ComputedBookingStats> & {
			total: number;
			upcoming: number;
			month: number;
			bookers: number;
			cancelled: number;
			rooms: number;
		};
		selectedRange?: BookingTimeRange;
		activeFilter?: BookingDrilldownFilter;
		loading?: boolean;
		error?: string;
		lastUpdated?: string;
		isRealtime?: boolean;
		onRangeChange?: (range: BookingTimeRange) => void;
		onDrilldown?: (filter: BookingDrilldownFilter) => void;
		onRefresh?: () => void;
	}

	let {
		stats,
		selectedRange = 'all',
		activeFilter = 'all',
		loading = false,
		error = '',
		lastUpdated = '',
		isRealtime = false,
		onRangeChange,
		onDrilldown,
		onRefresh
	}: Props = $props();

	let trendMetric = $state<'count' | 'hours'>('count');

	const totalBookings = $derived(stats.totalBookings ?? stats.total + stats.cancelled);
	const totalHours = $derived(stats.totalHours ?? 0);
	const cancellationRate = $derived(
		stats.cancellationRate ??
			(totalBookings > 0 ? Math.round((stats.cancelled / totalBookings) * 1000) / 10 : 0)
	);
	const peakHour = $derived(stats.peakHour ?? null);
	const mostBookedRoom = $derived(stats.mostBookedRoom ?? null);
	const trend = $derived(stats.trend ?? []);

	const rangeLabel = $derived(
		BOOKING_TIME_RANGES.find((r) => r.value === selectedRange)?.label ?? 'ทั้งหมด'
	);

	const maxTrendValue = $derived(
		Math.max(
			1,
			...trend.map((b) => (trendMetric === 'hours' ? Number(b.hours) || 0 : Number(b.count) || 0))
		)
	);
	const totalTrendCount = $derived(trend.reduce((sum, b) => sum + (Number(b.count) || 0), 0));

	function formatUpdated(val: string) {
		if (!val) return 'ยังไม่อัปเดต';
		const d = new Date(val.replace(' ', 'T'));
		if (Number.isNaN(d.getTime())) return val;
		return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function selectRange(range: BookingTimeRange) {
		if (selectedRange === range) return;
		onRangeChange?.(range);
	}

	function toggleFilter(filter: BookingDrilldownFilter) {
		const next = activeFilter === filter && filter !== 'all' ? 'all' : filter;
		onDrilldown?.(next);
	}
</script>

<section class="space-y-4" aria-label="สถิติระบบจองห้อง">
	<!-- Top Control Bar: Badge, Last Updated, Refresh, Time Range Selector -->
	<div
		class="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center"
	>
		<div class="flex flex-wrap items-center gap-2.5">
			<span class="text-sm font-semibold">ภาพรวมสถิติการจองห้อง</span>

			<span
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold {isRealtime
					? 'border-emerald-200 bg-emerald-50 text-emerald-700'
					: 'border-slate-200 bg-slate-100 text-slate-700'}"
			>
				<span
					class="h-1.5 w-1.5 rounded-full {isRealtime
						? 'animate-pulse bg-emerald-500'
						: 'bg-slate-400'}"
				></span>
				{isRealtime ? 'Realtime' : 'Snapshot'}
			</span>

			<span class="text-xs text-muted-foreground">
				อัปเดตล่าสุด: <b class="text-foreground">{formatUpdated(lastUpdated)}</b>
			</span>

			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-muted/60 disabled:opacity-50"
				onclick={() => onRefresh?.()}
				disabled={loading}
			>
				<span class={loading ? ' inline-block animate-spin' : ''}>↻</span>
				<span>{loading ? 'กำลังรีเฟรช...' : 'รีเฟรช'}</span>
			</button>
		</div>

		<!-- Time Range Filter -->
		<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="ตัวเลือกช่วงเวลาสถิติ">
			{#each BOOKING_TIME_RANGES as item (item.value)}
				<button
					type="button"
					class="rounded-lg px-3 py-1.5 text-xs font-semibold transition {selectedRange === item.value
						? 'bg-indigo-600 text-white shadow-xs'
						: 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'}"
					aria-pressed={selectedRange === item.value}
					onclick={() => selectRange(item.value)}
				>
					{item.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Loading & Error States -->
	{#if loading && !lastUpdated}
		<div class="rounded-xl border border-border bg-card p-8 text-center" role="status">
			<p class="text-sm font-semibold">กำลังโหลดสถิติ...</p>
			<p class="mt-1 text-xs text-muted-foreground">กำลังดึงข้อมูลการจองและการใช้งานห้อง</p>
		</div>
	{:else if error}
		<div
			class="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 sm:flex-row sm:items-center"
			role="alert"
		>
			<div>
				<p class="text-sm font-bold">โหลดข้อมูลไม่ได้</p>
				<p class="mt-0.5 text-xs text-rose-700">{error}</p>
			</div>
			<button
				type="button"
				class="self-start rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800"
				onclick={() => onRefresh?.()}
			>
				ลองใหม่
			</button>
		</div>
	{:else}
		{#if activeFilter !== 'all'}
			<div
				class="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-xs text-indigo-900"
			>
				<span>กำลังกรองตารางการจองตามบัตรสถิติที่เลือก · คลิกบัตรเดิมซ้ำเพื่อแสดงทั้งหมด</span>
				<button
					type="button"
					class="font-semibold text-indigo-700 hover:underline"
					onclick={() => toggleFilter('all')}
				>
					ล้างตัวกรอง
				</button>
			</div>
		{/if}

		<!-- Clickable Status / Drill-down Cards -->
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			<button
				type="button"
				class="rounded-xl border p-4 text-left transition hover:shadow-xs {activeFilter === 'all'
					? 'border-indigo-600 bg-card ring-2 ring-indigo-500/20'
					: 'border-border bg-card hover:border-indigo-300'}"
				onclick={() => toggleFilter('all')}
			>
				<p class="text-xs text-muted-foreground">การจองทั้งหมด ({rangeLabel})</p>
				<p class="mt-2 text-2xl font-bold">{totalBookings.toLocaleString()}</p>
				<p class="mt-1 text-[11px] text-muted-foreground">คลิกแสดงทั้งหมด</p>
			</button>

			<button
				type="button"
				class="rounded-xl border p-4 text-left transition hover:shadow-xs {activeFilter === 'active'
					? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
					: 'border-border bg-card hover:border-emerald-300'}"
				onclick={() => toggleFilter('active')}
			>
				<p class="text-xs text-muted-foreground">การจองที่ใช้งาน</p>
				<p class="mt-2 text-2xl font-bold text-emerald-700">{stats.total.toLocaleString()}</p>
				<p class="mt-1 text-[11px] text-muted-foreground">ผู้จอง {stats.bookers.toLocaleString()} คน</p>
			</button>

			<button
				type="button"
				class="rounded-xl border p-4 text-left transition hover:shadow-xs {activeFilter === 'upcoming'
					? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20'
					: 'border-border bg-card hover:border-amber-300'}"
				onclick={() => toggleFilter('upcoming')}
			>
				<p class="text-xs text-muted-foreground">กำลังจะมาถึง</p>
				<p class="mt-2 text-2xl font-bold text-amber-700">{stats.upcoming.toLocaleString()}</p>
				<p class="mt-1 text-[11px] text-muted-foreground">คลิกเพื่อดูคิวที่กำลังมาถึง</p>
			</button>

			<button
				type="button"
				class="rounded-xl border p-4 text-left transition hover:shadow-xs {activeFilter === 'cancelled'
					? 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-500/20'
					: 'border-border bg-card hover:border-rose-300'}"
				onclick={() => toggleFilter('cancelled')}
			>
				<p class="text-xs text-muted-foreground">ยกเลิกแล้ว</p>
				<p class="mt-2 text-2xl font-bold text-rose-700">{stats.cancelled.toLocaleString()}</p>
				<p class="mt-1 text-[11px] text-muted-foreground">อัตรายกเลิก {cancellationRate}%</p>
			</button>

			<article class="rounded-xl border border-border bg-card p-4">
				<p class="text-xs text-muted-foreground">เดือนนี้ (รวม)</p>
				<p class="mt-2 text-2xl font-bold">{stats.month.toLocaleString()}</p>
				<p class="mt-1 text-[11px] text-muted-foreground">รายการที่ใช้งานเดือนปัจจุบัน</p>
			</article>

			<article class="rounded-xl border border-border bg-card p-4">
				<p class="text-xs text-muted-foreground">ห้องทั้งหมด</p>
				<p class="mt-2 text-2xl font-bold">{stats.rooms.toLocaleString()}</p>
				<p class="mt-1 text-[11px] text-muted-foreground">พร้อมเปิดให้จอง</p>
			</article>
		</div>

		<!-- App-specific Metrics + Trend Chart -->
		<div class="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">ชั่วโมงใช้งานห้องรวม ({rangeLabel})</p>
					<p class="mt-2 text-2xl font-bold text-indigo-700">
						{totalHours.toLocaleString()} <span class="text-sm font-normal text-muted-foreground">ชม.</span>
					</p>
					<p class="mt-1 text-xs text-muted-foreground">เฉพาะการจองที่ไม่ถูกยกเลิก</p>
				</div>

				<div class="rounded-xl border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">ช่วงเวลายอดนิยม (Peak Hour)</p>
					{#if peakHour}
						<p class="mt-2 text-lg font-bold">{peakHour.slot}</p>
						<p class="mt-1 text-xs text-indigo-600 font-medium">มีการจองทับซ้อน {peakHour.count} ครั้ง</p>
					{:else}
						<p class="mt-2 text-sm font-semibold text-muted-foreground">ยังไม่มีข้อมูล</p>
						<p class="mt-1 text-xs text-muted-foreground">รอข้อมูลการจองในช่วงเวลานี้</p>
					{/if}
				</div>

				<div class="rounded-xl border border-border bg-card p-4">
					<p class="text-xs text-muted-foreground">อัตรายกเลิก (Cancellation Rate)</p>
					<p class="mt-2 text-2xl font-bold {cancellationRate > 25 ? 'text-rose-600' : 'text-foreground'}">
						{cancellationRate}%
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						ยกเลิก {stats.cancelled} จากทั้งหมด {totalBookings} รายการ
					</p>
				</div>

				<button
					type="button"
					disabled={!mostBookedRoom}
					class="rounded-xl border p-4 text-left transition {mostBookedRoom &&
					activeFilter === `room:${mostBookedRoom.id}`
						? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
						: 'border-border bg-card hover:border-indigo-300'} disabled:cursor-default"
					onclick={() => mostBookedRoom && toggleFilter(`room:${mostBookedRoom.id}`)}
				>
					<p class="text-xs text-muted-foreground">ห้องที่ถูกจองมากที่สุด</p>
					{#if mostBookedRoom}
						<p class="mt-2 truncate text-lg font-bold" title={mostBookedRoom.name}>
							{mostBookedRoom.name}
						</p>
						<p class="mt-1 text-xs text-indigo-600 font-medium">
							{mostBookedRoom.count} ครั้ง ({mostBookedRoom.hours} ชม.) · คลิกเพื่อกรอง
						</p>
					{:else}
						<p class="mt-2 text-sm font-semibold text-muted-foreground">ยังไม่มีข้อมูล</p>
						<p class="mt-1 text-xs text-muted-foreground">ยังไม่มีการจองในช่วงเวลานี้</p>
					{/if}
				</button>
			</div>

			<!-- Trend Chart -->
			<div class="flex flex-col justify-between rounded-xl border border-border bg-card p-4">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<h3 class="text-sm font-semibold">แนวโน้มการจองห้อง ({rangeLabel})</h3>
						<p class="text-xs text-muted-foreground">
							รวม {totalTrendCount} รายการ · ใช้งานจริง {totalHours} ชม.
						</p>
					</div>
					<div class="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
						<button
							type="button"
							class="rounded-md px-2.5 py-1 font-medium transition {trendMetric === 'count'
								? 'bg-background text-foreground shadow-2xs'
								: 'text-muted-foreground'}"
							onclick={() => (trendMetric = 'count')}
						>
							จำนวนครั้ง
						</button>
						<button
							type="button"
							class="rounded-md px-2.5 py-1 font-medium transition {trendMetric === 'hours'
								? 'bg-background text-foreground shadow-2xs'
								: 'text-muted-foreground'}"
							onclick={() => (trendMetric = 'hours')}
						>
							ชั่วโมงใช้งาน
						</button>
					</div>
				</div>

				{#if trend.length === 0 || totalTrendCount === 0}
					<div
						class="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground"
					>
						ไม่มีข้อมูลการจองในช่วงเวลาที่เลือก
					</div>
				{:else}
					<div class="flex h-44 items-end gap-1.5 overflow-x-auto pt-6 pb-1">
						{#each trend as bucket (bucket.key)}
							{@const value = trendMetric === 'hours' ? bucket.hours : bucket.count}
							{@const heightPct = Math.max(
								value > 0 ? 12 : 4,
								Math.round((value / maxTrendValue) * 100)
							)}
							<div class="group flex min-w-[24px] flex-1 flex-col items-center gap-1">
								<span class="text-[10px] font-semibold text-muted-foreground">
									{value > 0 ? value : ''}
								</span>
								<div class="flex h-28 w-full items-end justify-center rounded-t-md bg-muted/40 px-0.5">
									<div
										class="w-full rounded-t-sm transition-all {value > 0
											? 'bg-indigo-600 group-hover:bg-indigo-700'
											: 'bg-border'}"
										style="height: {heightPct}%"
										title="{bucket.label}: {bucket.count} รายการ ({bucket.hours} ชม.)"
									></div>
								</div>
								<span class="max-w-full truncate text-[10px] text-muted-foreground" title={bucket.label}>
									{bucket.label}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>
