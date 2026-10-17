<script lang="ts">
  let { stats }: { stats: { total: number; upcoming: number; month: number; bookers: number; cancelled: number; rooms: number } } = $props();

  const cards = $derived([
    ['การจองที่ใช้งาน', stats.total],
    ['กำลังจะมาถึง', stats.upcoming],
    ['เดือนนี้', stats.month],
    ['ผู้จอง', stats.bookers],
    ['ยกเลิกแล้ว', stats.cancelled],
    ['ห้องทั้งหมด', stats.rooms]
  ] as const);
</script>

<section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="สถิติระบบจองห้อง">
  {#each cards as card}
    <article class="rounded-xl border border-border bg-card p-4">
      <p class="text-xs text-muted-foreground">{card[0]}</p>
      <p class="mt-2 text-2xl font-bold">{card[1].toLocaleString()}</p>
    </article>
  {/each}
</section>
