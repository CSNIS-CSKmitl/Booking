<script lang="ts">
	import { page } from '$app/state';
	import { CalendarPlus, LogOut, User, LayoutDashboard } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import ThemeToggle from './ThemeToggle.svelte';
	import AdminLink from './AdminLink.svelte';
	import type { AuthUser } from '$lib/types';

	// page.data.user มาจาก +layout.server.ts (อ่านจาก pb_auth cookie)
	const user = $derived(page.data.user as AuthUser | null);

	/** fallback ลำดับ: ชื่อจริง → ส่วนหน้า @ ของ email → "ผู้ใช้" */
	function displayName(name: string, email: string): string {
		const trimmed = (name ?? '').trim();
		if (trimmed) return trimmed;
		const prefix = email?.split('@')[0];
		return prefix || 'ผู้ใช้';
	}

	function avatarChar(name: string, email: string): string {
		const source = (name && name.trim()) || email || '?';
		return source.charAt(0).toUpperCase();
	}
</script>

{#if user}
	<header
		class="bg-background/60 supports-[backdrop-filter]:bg-background/40 border-border/40 sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300"
	>
		<div
			class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3.5 md:px-10"
		>
			<!-- Left: brand -->
			<a
				href="/book"
				class="group flex items-center gap-2.5 font-sans text-lg font-bold tracking-tight text-foreground transition-colors duration-200 hover:opacity-90"
			>
				<span class="relative flex h-2.5 w-2.5">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
				</span>
				<span
					class="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text"
				>
					Booking
				</span>
				<span
					class="text-muted-foreground/60 hidden text-xs font-normal transition-colors duration-200 group-hover:text-muted-foreground sm:inline"
				>
					| ระบบจองห้องประชุม
				</span>
			</a>

			<!-- Right: actions + user info + logout -->
			<div class="flex flex-wrap items-center gap-2 sm:gap-4">
				<AdminLink />
				<Button
					href="/"
					variant="outline"
					size="sm"
					class="gap-1.5 border-border/60 hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:-translate-y-0.5"
				>
					<LayoutDashboard class="h-4 w-4" />
					ดูตารางใช้งาน
				</Button>

				<Button
					href="/book"
					variant="default"
					size="sm"
					class="shadow-emerald-500/10 hover:shadow-emerald-500/20 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5"
				>
					<CalendarPlus class="h-4 w-4" />
					จองห้อง
				</Button>

				<ThemeToggle />

				<Separator orientation="vertical" class="border-border/30 h-6" />

				<!-- User Profile Card -->
				<div class="flex items-center gap-3">
					<div class="hidden text-right sm:block">
						<div class="text-sm font-semibold text-foreground leading-tight">
							{displayName(user.name, user.email)}
						</div>
						<div class="text-muted-foreground/75 font-mono text-[10px] tracking-wide mt-0.5">
							{user.email}
						</div>
					</div>

					<div
						class="bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500 text-white shadow-indigo-500/20 relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-md ring-2 ring-background transition-transform duration-300 hover:scale-105"
						aria-hidden="true"
					>
						{avatarChar(user.name, user.email)}
					</div>
				</div>

				<form method="POST" action="/auth/logout" class="flex items-center">
					<Button
						type="submit"
						variant="outline"
						size="sm"
						class="border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 gap-1.5 transition-colors duration-200"
					>
						<LogOut class="h-3.5 w-3.5" />
						<span class="hidden md:inline">Logout</span>
					</Button>
				</form>
			</div>
		</div>
	</header>
{/if}
