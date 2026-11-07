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

	function handleAdvisorInput() {
		if (teachers && teachers.length > 0) {
			const matched = teachers.find((t) => t.name === advisorName.trim());
			advisorEmail = matched?.email || "";
		}
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

		<div class="flex flex-col gap-1.5">
			<Label for="book-advisor" class="text-xs font-semibold text-foreground/80">
				อาจารย์ที่ปรึกษา <span class="text-muted-foreground font-normal">(ไม่บังคับ)</span>
			</Label>
			<Input
				id="book-advisor"
				type="text"
				bind:value={advisorName}
				list={teachers && teachers.length > 0 ? "teachers-list" : undefined}
				maxlength={100}
				placeholder="พิมพ์ชื่ออาจารย์ที่ปรึกษา"
				class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
				oninput={handleAdvisorInput}
				onchange={handleAdvisorInput}
			/>
			{#if teachers && teachers.length > 0}
				<datalist id="teachers-list">
					{#each teachers as t (t.id)}
						<option value={t.name}>{t.name}{t.email ? ` (${t.email})` : ''}</option>
					{/each}
				</datalist>
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
