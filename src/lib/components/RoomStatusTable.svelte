<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';

	let { roomRows = [] } = $props();
</script>

<div class="bg-card w-full overflow-hidden rounded-2xl border shadow-2xl">
	<Table.Root>
		<Table.Header>
			<Table.Row class="bg-muted/60 border-b">
				<Table.Head class="p-6 text-xs font-bold tracking-wider uppercase">ชื่อห้อง</Table.Head>
				<Table.Head class="p-6 text-xs font-bold tracking-wider uppercase">สถานะ</Table.Head>
				<Table.Head class="p-6 text-xs font-bold tracking-wider uppercase">กิจกรรมในตอนนี้</Table.Head>
				<Table.Head class="p-6 text-xs font-bold tracking-wider uppercase">เวลา</Table.Head>
				<Table.Head class="p-6 text-xs font-bold tracking-wider uppercase">ผู้จอง</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if roomRows.length > 0}
				{#each roomRows as row (row.id)}
					<Table.Row class="hover:bg-muted/30">
						<Table.Cell class="p-6">
							<div class="font-bold">{row.roomName}</div>
							<div class="text-muted-foreground mt-0.5 text-xs">{row.roomLocation}</div>
						</Table.Cell>

						<Table.Cell class="p-6">
							{#if row.isOccupied}
								<Badge variant="destructive" class="gap-1.5">
									<span class="bg-destructive h-1.5 w-1.5 rounded-full"></span>
									กำลังใช้งาน
								</Badge>
							{:else}
								<Badge variant="success" class="gap-1.5">
									<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
									ว่าง
								</Badge>
							{/if}
						</Table.Cell>

						<Table.Cell class="max-w-[20vw] truncate p-6 font-medium">
							{row.currentTitle}
						</Table.Cell>

						<Table.Cell class="text-muted-foreground p-6 font-mono">
							{row.timeRange}
						</Table.Cell>

						<Table.Cell class="text-muted-foreground p-6">
							{row.bookerName}
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan={5} class="text-muted-foreground p-16 text-center">
						กำลังดึงข้อมูลระบบห้องประชุมเรียลไทม์...
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>