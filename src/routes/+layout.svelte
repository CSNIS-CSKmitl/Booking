<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/Topbar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="light" />
<Toaster />

<!-- <Topbar /> -->
<div class="flex min-h-screen flex-col">
	<div class="flex-1">{@render children()}</div>
	<footer class="border-t border-border bg-background px-4 py-6 text-center text-xs text-muted-foreground">
		<span>© {new Date().getFullYear()} <a href="https://github.com/techasit5415" target="_blank" rel="noopener noreferrer" class="hover:text-foreground hover:underline">Techasit Vanitpattarakul</a></span>
	</footer>
</div>
