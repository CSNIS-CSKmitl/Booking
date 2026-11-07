<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { slide } from "svelte/transition";
	import { GraduationCap, Mail, PenLine, ListFilter } from "@lucide/svelte";
	import type { AdvisorFieldMode } from "$lib/roles";

	let {
		title = $bindable(),
		notes = $bindable(),
		advisorName = $bindable(),
		advisorEmail = $bindable(""),
		customBookerName = $bindable(),
		isAdmin,
		advisorMode = "hidden",
		teachers = [],
	}: {
		title: string;
		notes: string;
		advisorName: string;
		advisorEmail?: string;
		customBookerName: string;
		isAdmin: boolean;
		advisorMode?: AdvisorFieldMode;
		teachers?: { id: string; name: string; email?: string }[];
	} = $props();

	let isCustomAdvisor = $state(false);
	let selectedTeacherId = $state("");

	// Sync selectedTeacherId if advisorName is set externally
	$effect(() => {
		if (advisorName && teachers.length > 0) {
			const matched = teachers.find(
				(t) => t.name.trim().toLowerCase() === advisorName.trim().toLowerCase()
			);
			if (matched) {
				if (selectedTeacherId !== matched.id) {
					selectedTeacherId = matched.id;
					advisorEmail = matched.email || "";
				}
			} else if (advisorMode === "allow_custom") {
				isCustomAdvisor = true;
			}
		} else if (!advisorName) {
			selectedTeacherId = "";
		}
	});

	function handleTeacherChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const id = select.value;
		if (id === "__custom__") {
			isCustomAdvisor = true;
			advisorName = "";
			advisorEmail = "";
			selectedTeacherId = "";
			return;
		}
		selectedTeacherId = id;
		const teacher = teachers.find((t) => t.id === id);
		if (teacher) {
			advisorName = teacher.name;
			advisorEmail = teacher.email || "";
		} else {
			advisorName = "";
			advisorEmail = "";
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

		<!-- Advisor Section:
		     1. 'strict_select' (Student และ Role Admin): บังคับเลือกจาก Dropdown เท่านั้น ห้ามพิมพ์เอง
		     2. 'allow_custom' (Staff และ Super Admin): มีให้ใส่ชื่อเองได้ หรือเลือกจากรายชื่ออาจารย์ (ไม่บังคับ)
		     3. 'hidden' (Teacher, Head): ซ่อน ไม่ต้องแสดง
		-->
		{#if advisorMode === "strict_select"}
			<div class="flex flex-col gap-1.5" transition:slide>
				<Label for="book-advisor" class="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
					<GraduationCap class="size-3.5 text-indigo-600" />
					อาจารย์ที่ปรึกษา <span class="text-destructive font-bold">*</span>
				</Label>

				<select
					id="book-advisor"
					value={selectedTeacherId}
					onchange={handleTeacherChange}
					required
					class="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 cursor-pointer"
				>
					<option value="">-- กรุณาเลือกอาจารย์ที่ปรึกษา --</option>
					{#each teachers as t (t.id)}
						<option value={t.id}>
							{t.name}{t.email ? ` (${t.email})` : ''}
						</option>
					{/each}
				</select>

				{#if advisorEmail}
					<div class="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-md px-2.5 py-1 mt-0.5" transition:slide>
						<Mail class="size-3 shrink-0" />
						<span>ส่งการแจ้งเตือนไปยัง: <strong class="font-mono">{advisorEmail}</strong></span>
					</div>
				{/if}
			</div>
		{:else if advisorMode === "allow_custom"}
			<div class="flex flex-col gap-1.5" transition:slide>
				<div class="flex items-center justify-between">
					<Label for="book-advisor" class="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
						<GraduationCap class="size-3.5 text-indigo-600" />
						อาจารย์ที่ปรึกษา <span class="text-muted-foreground font-normal">(ไม่บังคับ)</span>
					</Label>
					{#if teachers && teachers.length > 0}
						<button
							type="button"
							onclick={() => {
								isCustomAdvisor = !isCustomAdvisor;
								if (!isCustomAdvisor && selectedTeacherId) {
									const teacher = teachers.find((t) => t.id === selectedTeacherId);
									if (teacher) {
										advisorName = teacher.name;
										advisorEmail = teacher.email || "";
									}
								}
							}}
							class="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer flex items-center gap-1"
						>
							{#if isCustomAdvisor}
								<ListFilter class="size-3" />
								<span>เลือกจากรายชื่ออาจารย์</span>
							{:else}
								<PenLine class="size-3" />
								<span>พิมพ์ระบุชื่อเอง</span>
							{/if}
						</button>
					{/if}
				</div>

				{#if isCustomAdvisor || !teachers || teachers.length === 0}
					<Input
						id="book-advisor"
						type="text"
						bind:value={advisorName}
						maxlength={100}
						placeholder="พิมพ์ชื่ออาจารย์ที่ปรึกษา (เช่น ศ.ดร. ...)"
						class="rounded-lg border-border focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
					/>
				{:else}
					<select
						id="book-advisor"
						value={selectedTeacherId}
						onchange={handleTeacherChange}
						class="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/20 focus-visible:border-indigo-600 cursor-pointer"
					>
						<option value="">-- ไม่ระบุอาจารย์ที่ปรึกษา --</option>
						{#each teachers as t (t.id)}
							<option value={t.id}>
								{t.name}{t.email ? ` (${t.email})` : ''}
							</option>
						{/each}
						<option value="__custom__">✏️ พิมพ์ระบุชื่อเอง...</option>
					</select>
				{/if}

				{#if advisorEmail}
					<div class="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-md px-2.5 py-1 mt-0.5" transition:slide>
						<Mail class="size-3 shrink-0" />
						<span>ส่งการแจ้งเตือนไปยัง: <strong class="font-mono">{advisorEmail}</strong></span>
					</div>
				{/if}
			</div>
		{/if}

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
