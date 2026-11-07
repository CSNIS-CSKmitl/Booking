<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { slide } from "svelte/transition";
	import { ChevronDown, Check, GraduationCap, X, Mail } from "@lucide/svelte";

	let {
		title = $bindable(),
		notes = $bindable(),
		advisorName = $bindable(),
		advisorEmail = $bindable(""),
		customBookerName = $bindable(),
		isAdmin,
		teachers = [],
	}: {
		title: string;
		notes: string;
		advisorName: string;
		advisorEmail?: string;
		customBookerName: string;
		isAdmin: boolean;
		teachers?: { id: string; name: string; email?: string }[];
	} = $props();

	let showSuggestions = $state(false);

	// Filter teachers based on current typed name or email
	const filteredTeachers = $derived(
		teachers.filter((t) => {
			if (!advisorName || !advisorName.trim()) return true;
			const q = advisorName.trim().toLowerCase();
			return (
				t.name.toLowerCase().includes(q) ||
				(t.email && t.email.toLowerCase().includes(q))
			);
		})
	);

	function handleAdvisorInput() {
		// When typing directly, auto-link email if there's an exact match
		if (teachers && teachers.length > 0) {
			const matched = teachers.find(
				(t) => t.name.trim().toLowerCase() === advisorName.trim().toLowerCase()
			);
			advisorEmail = matched?.email || "";
		} else {
			advisorEmail = "";
		}
	}

	function selectTeacher(teacher: { id: string; name: string; email?: string }) {
		advisorName = teacher.name;
		advisorEmail = teacher.email || "";
		showSuggestions = false;
	}

	function clearAdvisor() {
		advisorName = "";
		advisorEmail = "";
		showSuggestions = false;
	}
</script>

<Card.Root
	class="border-border bg-card rounded-xl overflow-hidden shadow-xs"
>
	<Card.Header
		class="border-b border-border/80 px-6 py-4 flex items-center"
	>
		<div class="flex items-center gap-2">
			<span
				class="bg-indigo-600 text-white font-mono text-[10px] font-bold flex h-4.5 w-4.5 items-center justify-center rounded-full"
			>
				3
			</span>
			<Card.Title
				class="text-sm font-semibold tracking-wide uppercase text-foreground/80"
			>
				รายละเอียดการใช้งาน
			</Card.Title>
		</div>
	</Card.Header>

	<Card.Content class="p-6 flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<Label
				for="book-title"
				class="text-xs font-semibold text-foreground/80"
			>
				หัวข้อการจอง <span class="text-destructive font-bold">*</span>
			</Label>
			<Input
				id="book-title"
				type="text"
				bind:value={title}
				placeholder="เช่น Marketing Team Sync-up, ประชุมปรึกษางาน"
				maxlength={200}
				class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
			/>
		</div>

		{#if isAdmin}
			<div class="flex flex-col gap-1.5" transition:slide>
				<Label
					for="booker-name-custom"
					class="text-xs font-semibold text-foreground/80"
				>
					ระบุชื่อผู้จอง (ในนามบุคคลอื่น - เฉพาะผู้ดูแลระบบ)
				</Label>
				<Input
					id="booker-name-custom"
					type="text"
					bind:value={customBookerName}
					placeholder="ดร. เรียนดี "
					maxlength={100}
					class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
				/>
			</div>
		{/if}

		<!-- Advisor Section: Instant typing enabled with optional rich autocomplete dropdown -->
		<div class="flex flex-col gap-1.5 relative">
			<div class="flex items-center justify-between">
				<Label for="book-advisor" class="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
					<GraduationCap class="size-3.5 text-indigo-600" />
					อาจารย์ที่ปรึกษา <span class="text-muted-foreground font-normal">(ไม่บังคับ)</span>
				</Label>
				{#if advisorName}
					<button
						type="button"
						class="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
						onclick={clearAdvisor}
					>
						<X class="size-3" /> ล้างข้อมูล
					</button>
				{/if}
			</div>

			<div class="relative">
				<Input
					id="book-advisor"
					type="text"
					bind:value={advisorName}
					maxlength={100}
					placeholder="พิมพ์ชื่ออาจารย์ที่ปรึกษาได้ทันที หรือเลือกจากรายชื่อ"
					class="rounded-lg border-border pr-9 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
					oninput={() => {
						handleAdvisorInput();
						showSuggestions = true;
					}}
					onfocus={() => {
						if (teachers && teachers.length > 0) {
							showSuggestions = true;
						}
					}}
					onkeydown={(e) => {
						if (e.key === "Escape") {
							showSuggestions = false;
						}
					}}
				/>

				{#if teachers && teachers.length > 0}
					<button
						type="button"
						tabindex="-1"
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-transform cursor-pointer p-0.5"
						onclick={() => (showSuggestions = !showSuggestions)}
						title="แสดง/ซ่อนรายชื่ออาจารย์"
					>
						<ChevronDown class="size-4 {showSuggestions ? 'rotate-180' : ''} transition-transform duration-200" />
					</button>
				{/if}

				<!-- Dropdown Suggestions Popover (Purely optional suggestions) -->
				{#if showSuggestions && teachers && teachers.length > 0}
					<!-- Background click detector -->
					<div
						class="fixed inset-0 z-40"
						onclick={() => (showSuggestions = false)}
						role="presentation"
					></div>

					<div
						class="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl"
					>
						<div class="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/60 mb-1">
							รายชื่ออาจารย์ในระบบ (เลือกเพื่อใส่อีเมลอัตโนมัติ หรือพิมพ์เองต่อได้ทันที)
						</div>

						{#if filteredTeachers.length === 0}
							<div class="px-3 py-3 text-center text-xs text-muted-foreground">
								ไม่พบอาจารย์ที่ตรงกับ "{advisorName}"<br />
								<span class="text-[11px] text-foreground/80 mt-1 inline-block">
									สามารถใช้ชื่อนี้ต่อไปได้ทันทีโดยไม่ต้องเลือกจากระบบ
								</span>
							</div>
						{:else}
							<div class="space-y-0.5">
								{#each filteredTeachers as t (t.id)}
									{@const isSelected = advisorName.trim().toLowerCase() === t.name.trim().toLowerCase()}
									<button
										type="button"
										class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors hover:bg-muted cursor-pointer {isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200' : 'text-foreground'}"
										onclick={() => selectTeacher(t)}
									>
										<div class="min-w-0">
											<p class="font-medium truncate">{t.name}</p>
											{#if t.email}
												<p class="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
													{t.email}
												</p>
											{/if}
										</div>
										{#if isSelected}
											<Check class="size-3.5 text-indigo-600 shrink-0" />
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Email helper notification banner -->
			{#if advisorEmail}
				<div class="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-md px-2.5 py-1 mt-0.5" transition:slide>
					<Mail class="size-3 shrink-0" />
					<span>อีเมลแจ้งเตือนอาจารย์: <b class="font-mono font-medium">{advisorEmail}</b></span>
				</div>
			{:else if advisorName.trim()}
				<p class="text-[11px] text-muted-foreground mt-0.5">
					ระบุชื่ออิสระ (ไม่มีอีเมลแจ้งเตือนอัตโนมัติ)
				</p>
			{/if}
		</div>

		<div class="flex flex-col gap-1.5">
			<Label
				for="book-notes"
				class="text-xs font-semibold text-foreground/80"
			>
				หมายเหตุ / สิ่งที่ต้องการเพิ่มเติม <span class="text-muted-foreground font-normal">(ไม่บังคับ)</span>
			</Label>
			<Textarea
				id="book-notes"
				bind:value={notes}
				placeholder="เช่น ระบุจำนวนผู้เข้าร่วม หรืออุปกรณ์เสริมที่ต้องการเพิ่มเติม"
				rows={3}
				maxlength={500}
				class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
			/>
		</div>
	</Card.Content>
</Card.Root>
