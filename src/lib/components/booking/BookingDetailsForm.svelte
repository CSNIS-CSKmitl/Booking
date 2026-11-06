<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { slide } from "svelte/transition";

	let {
		title = $bindable(),
		notes = $bindable(),
		advisorName = $bindable(),
		customBookerName = $bindable(),
		isAdmin,
		teachers = [],
	}: {
		title: string;
		notes: string;
		advisorName: string;
		customBookerName: string;
		isAdmin: boolean;
		teachers?: { id: string; name: string; email?: string }[];
	} = $props();

	let isCustomAdvisor = $state(false);

	$effect(() => {
		if (advisorName && teachers && teachers.length > 0) {
			const found = teachers.some((t) => t.name === advisorName);
			if (!found && !isCustomAdvisor) {
				isCustomAdvisor = true;
			}
		}
	});
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

		<div class="flex flex-col gap-1.5">
			<div class="flex items-center justify-between">
				<Label for="book-advisor" class="text-xs font-semibold text-foreground/80">
					อาจารย์ที่ปรึกษา <span class="text-muted-foreground font-normal">(ไม่บังคับ)</span>
				</Label>
				{#if teachers && teachers.length > 0}
					<button
						type="button"
						onclick={() => {
							isCustomAdvisor = !isCustomAdvisor;
							if (!isCustomAdvisor && !teachers.some((t) => t.name === advisorName)) {
								advisorName = '';
							}
						}}
						class="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer"
					>
						{isCustomAdvisor ? "เลือกจากรายชื่ออาจารย์" : "พิมพ์ระบุชื่อเอง"}
					</button>
				{/if}
			</div>

			{#if !isCustomAdvisor && teachers && teachers.length > 0}
				<select
					id="book-advisor-select"
					class="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 cursor-pointer"
					value={advisorName}
					onchange={(e) => {
						const val = (e.target as HTMLSelectElement).value;
						if (val === '__custom__') {
							isCustomAdvisor = true;
							advisorName = '';
						} else {
							advisorName = val;
						}
					}}
				>
					<option value="">-- ไม่ระบุอาจารย์ที่ปรึกษา --</option>
					{#each teachers as t (t.id)}
						<option value={t.name}>
							{t.name}{t.email ? ` (${t.email})` : ''}
						</option>
					{/each}
					<option value="__custom__">✏️ อื่นๆ (พิมพ์ระบุชื่อเอง)...</option>
				</select>
			{:else}
				<Input
					id="book-advisor"
					type="text"
					bind:value={advisorName}
					maxlength={100}
					placeholder="พิมพ์ชื่ออาจารย์ที่ปรึกษา"
					class="rounded-lg border-border"
				/>
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
				class="resize-none rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
			/>
		</div>
	</Card.Content>
</Card.Root>
