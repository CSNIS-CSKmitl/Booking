<script lang="ts">
	import { page } from '$app/state';
	import { CalendarPlus, LogOut, LayoutDashboard } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import ThemeToggle from './ThemeToggle.svelte';
	import AdminLink from './AdminLink.svelte';
	import type { AuthUser } from '$lib/types';

	const user = $derived(page.data.user as AuthUser | null);

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
		class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm"
	>
		<div
			class="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-8"
		>
			<!-- Left: brand -->
			<a
				href="/book"
				class="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-85"
			>
				<span class="size-2 rounded-full bg-emerald-500"></span>
				<span>Booking</span>
				<span
					class="hidden text-xs font-normal text-muted-foreground sm:inline"
				>
					· ระบบจองห้องประชุม CS KMITL
				</span>
			</a>

			<!-- Right: actions + user info + logout -->
			<div class="flex items-center gap-2 sm:gap-3">
				<AdminLink />
				<Button
					href="/"
					variant="outline"
					size="sm"
					class="h-8 gap-1.5 text-xs font-medium"
				>
					<LayoutDashboard class="h-3.5 w-3.5" strokeWidth={1.5} />
					<span>ดูตาราง</span>
				</Button>

				<Button
					href="/book"
					variant="default"
					size="sm"
					class="h-8 gap-1.5 text-xs font-medium"
				>
					<CalendarPlus class="h-3.5 w-3.5" strokeWidth={1.5} />
					<span>จองห้อง</span>
				</Button>

				<ThemeToggle />

				<Separator orientation="vertical" class="h-5" />

				<!-- User Profile Card -->
				<div class="flex items-center gap-2.5">
					<div class="hidden text-right sm:block">
						<div class="text-xs font-medium text-foreground leading-tight">
							{displayName(user.name, user.email)}
						</div>
						<div class="text-muted-foreground font-mono text-[10px]">
							{user.email}
						</div>
					</div>

					<div
						class="grid size-7 place-items-center rounded-full border border-border bg-muted font-mono text-xs font-medium text-foreground"
						aria-hidden="true"
					>
						{avatarChar(user.name, user.email)}
					</div>
				</div>

				<form method="POST" action="/auth/logout" class="flex items-center">
					<Button
						type="submit"
						variant="ghost"
						size="sm"
						class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
						title="ออกจากระบบ"
					>
						<LogOut class="h-3.5 w-3.5" strokeWidth={1.5} />
					</Button>
				</form>
			</div>
		</div>
	</header>
{/if}
