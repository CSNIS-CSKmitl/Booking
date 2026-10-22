<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import {
		Calendar,
		Clock,
		MapPin,
		User,
		FileText,
		RefreshCw,
	} from "@lucide/svelte";

	let {
		open = $bindable(false),
		roomName,
		roomLocation,
		date,
		startTime,
		endTime,
		title,
		notes = "",
		advisorName = "",
		isRecurring = false,
		recurringUntil = "",
		recurringDaysText = "",
		customBookerName = "",
		submitting = false,
		onConfirm,
		onClose,
	}: {
		open: boolean;
		roomName: string;
		roomLocation: string;
		date: string;
		startTime: string;
		endTime: string;
		title: string;
		notes?: string;
		advisorName?: string;
		isRecurring?: boolean;
		recurringUntil?: string;
		recurringDaysText?: string;
		customBookerName?: string;
		submitting?: boolean;
		onConfirm: () => void;
		onClose: () => void;
	} = $props();

	let accepted = $state(false);

	// Reset checkbox state when modal closes
	$effect(() => {
		if (!open) {
			accepted = false;
		}
	});

	// Trigger confirmation on form submit
	function handleConfirm() {
		if (accepted && !submitting) {
			onConfirm();
		}
	}

	function handleClose() {
		onClose();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px] bg-card border border-border rounded-2xl shadow-xl animate-in fade-in duration-200"
	>
		<Dialog.Header class="shrink-0 space-y-2 border-b border-border p-4 pr-10 sm:p-6 sm:pr-12">
			<Dialog.Title
				class="text-lg font-bold text-foreground flex items-center gap-2"
			>
				<div
					class="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
				>
					<Calendar class="h-4.5 w-4.5" />
				</div>
				ยืนยันการส่งคำขอจองห้อง
			</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				โปรดตรวจสอบรายละเอียดและยอมรับข้อตกลงก่อนส่งคำขอจองห้องประชุม
			</Dialog.Description>
		</Dialog.Header>

		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:px-6 scrollbar-thin">
		<div
			class="space-y-3.5 border-b border-border pb-4 break-words"
		>
			<!-- Room -->
			<div class="flex items-start gap-3">
				<div
					class="p-1.5 rounded-lg bg-muted text-muted-foreground mt-0.5"
				>
					<MapPin class="h-4 w-4" />
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
					>
						ห้องเรียน / ห้องประชุม
					</p>
					<p class="text-sm font-semibold text-foreground truncate">
						{roomName || "ยังไม่ได้เลือกห้อง"} ,
						<span
							class="text-xs font-semibold text-muted-foreground"
							>({roomLocation})</span
						>
					</p>
				</div>
			</div>

			<!-- Date & Time -->
			<div class="flex items-start gap-3">
				<div
					class="p-1.5 rounded-lg bg-muted text-muted-foreground mt-0.5"
				>
					<Clock class="h-4 w-4" />
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
					>
						วันและเวลา
					</p>
					<p class="text-sm font-semibold text-foreground">
						{date} ({startTime} - {endTime} น.)
					</p>
				</div>
			</div>

			<!-- Title -->
			<div class="flex items-start gap-3">
				<div
					class="p-1.5 rounded-lg bg-muted text-muted-foreground mt-0.5"
				>
					<FileText class="h-4 w-4" />
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
					>
						หัวข้อการจอง
					</p>
					<p class="text-sm font-medium text-foreground break-words">
						{title || "ไม่ระบุหัวข้อ"}
					</p>
				</div>
			</div>

			<!-- Booker Name (if custom) -->
			{#if customBookerName}
				<div class="flex items-start gap-3">
					<div
						class="p-1.5 rounded-lg bg-muted text-muted-foreground mt-0.5"
					>
						<User class="h-4 w-4" />
					</div>
					<div class="flex-1 min-w-0">
						<p
							class="text-xs text-muted-foreground uppercase tracking-wider"
						>
							ผู้จอง
						</p>
						<p class="text-sm text-foreground truncate">
							{customBookerName}
						</p>
					</div>
				</div>
			{/if}

			<!-- Recurring Info -->
			{#if isRecurring}
				<div class="flex items-start gap-3">
					<div
						class="p-1.5 rounded-lg bg-muted text-muted-foreground mt-0.5"
					>
						<RefreshCw class="h-4 w-4" />
					</div>
					<div class="flex-1 min-w-0">
						<p
							class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
						>
							การจองซ้ำ (Weekly)
						</p>
						<p
							class="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
						>
							จองซ้ำทุกวัน {recurringDaysText}
						</p>
						<p class="text-[11px] text-muted-foreground mt-0.5">
							จนถึงวันที่: {recurringUntil}
						</p>
					</div>
				</div>
			{/if}

			<!-- Notes -->
			{#if advisorName.trim()}
				<div class="text-sm text-foreground break-words">
					<p class="text-xs text-muted-foreground">อาจารย์ที่ปรึกษา</p>
					<p>{advisorName}</p>
				</div>
			{/if}
			{#if notes}
				<div class="flex items-start gap-3">
					<div
						class="p-1.5 rounded-lg bg-muted text-muted-foreground mt-0.5"
					>
						<FileText class="h-4 w-4" />
					</div>
					<div class="flex-1 min-w-0">
						<p
							class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
						>
							รายละเอียดเพิ่มเติม
						</p>
						<p
							class="text-sm text-foreground/80 whitespace-pre-wrap"
						>
							{notes}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Guidelines / Agreements Section -->
		<div class="mt-4 flex flex-col gap-2">
			<Card.Root class="p-3 bg-amber-500/20 border-border rounded-xl shadow-none">
				<p class="text-sm font-semibold text-foreground">
					หลังเสร็จสิ้นการใช้งาน กรุณาปิดเครื่องเสียง ปิดไฟ และจัดเก้าอี้ให้เรียบร้อย
				</p>
			</Card.Root>
			<Card.Root
				class="p-3 bg-amber-500/20 border-border rounded-xl shadow-none"
			>
				<p class="text-sm font-semibold text-foreground">
					1.
					ขอให้ตรวจสอบข้อมูลรายละเอียดการจองให้เรียบร้อยก่อนกดยืนยัน
				</p>
			</Card.Root>

			<Card.Root
				class="p-3 bg-amber-500/20 border-border rounded-xl shadow-none"
			>
				<p class="text-sm font-semibold text-foreground mb-1">
					2. กรณีขออนุญาตใช้ห้องปฏิบัติการนอกเวลาราชการ
				</p>
				<p class="text-muted-foreground text-xs pl-4 leading-normal">
					หากวัสดุ อุปกรณ์ ครุภัณฑ์ที่อยู่ภายในห้องปฏิบัติการ
					เกิดการชำรุด เสียหาย หรือสูญหาย
					ให้นักศึกษาและอาจารย์ผู้ขออนุญาตเป็นผู้รับผิดชอบ
					ชดใช้ค่าเสียหายทั้งหมด
				</p>
			</Card.Root>
		</div>
		</div>

		<!-- Acceptance Checkbox -->
		<div class="shrink-0 border-t border-border bg-card p-4 sm:px-6">
		<label
			class="flex items-start gap-2.5 cursor-pointer select-none"
		>
			<input
				type="checkbox"
				bind:checked={accepted}
				class="h-4.5 w-4.5 shrink-0 mt-0.5 rounded border-border text-indigo-600 focus:ring-indigo-500 bg-card cursor-pointer"
			/>
			<span
				class="text-xs text-muted-foreground font-medium leading-tight"
			>
				ฉันได้อ่านและยอมรับเงื่อนไขในการจองห้องปฏิบัติการข้างต้น
			</span>
		</label>

		<Dialog.Footer class="flex flex-row gap-2 mt-3">
			<Button
				variant="outline"
				onclick={handleClose}
				disabled={submitting}
				class="w-full sm:w-auto rounded-xl"
			>
				ยกเลิก
			</Button>
			<Button
				onclick={handleConfirm}
				disabled={submitting || !accepted}
				class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
			>
				{#if submitting}
					กำลังดำเนินการ...
				{:else}
					ยืนยันส่งคำขอ
				{/if}
			</Button>
		</Dialog.Footer>
		</div>
	</Dialog.Content>
</Dialog.Root>
