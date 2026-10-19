<script lang="ts">
 import { onMount } from 'svelte';
 type Item = { id:string; title:string; body:string; priority:string; revision:string; link_url?:string; link_label?:string };
 let items: Item[] = $state([]); let open = $state(false); let index = $state(0); let read = new Set<string>();
 onMount(() => { fetch('/api/announcements').then(r => r.json()).then(x => { items = x.items ?? []; if (items.length) open = true; }).catch(() => {}); });
 function mark() { const x = items[index]; if (!x) return; read.add(`${x.id}:${x.revision}`); void fetch('/api/announcements', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({announcement:x.id, revision:x.revision}) }); if (++index >= items.length) open = false; }
</script>
{#if open && items[index]}
 <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onclick={(event) => event.target === event.currentTarget && mark()}>
 <aside class="w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl" role="dialog" aria-modal="true">
  <div class="mb-2 flex items-center justify-between"><strong>ประกาศ</strong><button aria-label="ปิด" onclick={() => { open=false; mark(); }}>×</button></div>
  <h2 class="text-lg font-semibold">{items[index].title}</h2><p class="mt-2 whitespace-pre-wrap text-sm">{items[index].body}</p>
  {#if items[index].link_url}<a class="mt-3 inline-block underline" href={items[index].link_url} target="_blank" rel="noreferrer">{items[index].link_label || 'อ่านเพิ่มเติม'}</a>{/if}
  <button class="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-white" onclick={mark}>รับทราบ</button>
 </aside>
 </div>
{/if}
