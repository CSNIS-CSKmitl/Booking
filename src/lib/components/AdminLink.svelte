<script lang="ts">
	import { page } from '$app/state';
	import { Shield } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

{#if page.data.user?.isAdmin}
	<Button href="/admin" size="sm" class="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700">
		<Shield class="h-4 w-4" />
		จัดการระบบ
	</Button>
{/if}
