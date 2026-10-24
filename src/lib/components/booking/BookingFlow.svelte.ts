import { getTodayDate, isValidRoomId, toBangkokIso, formatDisplayTime, checkOverlap, validateForm, getBookingDateInBangkok } from "$lib/utils/booking-helpers";
import PocketBase from "pocketbase";
import type { Room, Booking } from "$lib/types";
import { toast } from "svelte-sonner";

export class BookingFlow {
	// Form fields reactive state
	selectedRoomId = $state<string>("");
	bookingDate = $state<string>(getTodayDate());
	startTime = $state<string>("09:00");
	endTime = $state<string>("10:00");
	title = $state<string>("");
	notes = $state<string>("");
	advisorName = $state<string>("");
	isRecurring = $state(false);
	recurringUntil = $state<string>("");
	recurringDays = $state<number[]>([]);
	customBookerName = $state("");
	showConfirm = $state(false);

	// Operational reactive state
	rooms = $state<Room[]>([]);
	loadingRooms = $state(true);
	existingBookings = $state<Booking[]>([]);
	loadingBookings = $state(false);
	submitting = $state(false);
	submitError = $state<string | null>(null);
	submitSuccess = $state(false);
	validationError = $state<string | null>(null);

	isAdminGetter: () => boolean;

	get isAdmin() {
		return this.isAdminGetter();
	}
	pb: PocketBase | null = null;

	THAI_DAYS = [
		"อาทิตย์",
		"จันทร์",
		"อังคาร",
		"พุธ",
		"พฤหัสบดี",
		"ศุกร์",
		"เสาร์",
	];

	recurringDaysText = $derived(
		this.recurringDays
			.map((d) => this.THAI_DAYS[d])
			.filter(Boolean)
			.join(", "),
	);

	constructor(isAdminGetter: () => boolean) {
		this.isAdminGetter = isAdminGetter;
	}

	init(pbInstance: PocketBase) {
		this.pb = pbInstance;
		void this.loadRooms();
	}

	selectRoom(id: string) {
		this.selectedRoomId = id;
		this.validationError = null;
	}

	toggleDay(day: number) {
		if (this.recurringDays.includes(day)) {
			if (this.recurringDays.length > 1) {
				this.recurringDays = this.recurringDays.filter((d) => d !== day);
			} else {
				toast.error("ต้องเลือกวันจองซ้ำอย่างน้อย 1 วัน");
			}
		} else {
			this.recurringDays = [...this.recurringDays, day].sort();
		}
	}

	async loadRooms() {
		if (!this.pb) return;
		try {
			const data = await this.pb
				.collection("rooms")
				.getFullList<Room>({ sort: "name" });
			this.rooms = data;
		} catch (err) {
			console.error("Failed to load rooms", err);
		} finally {
			this.loadingRooms = false;
		}
	}

	async loadBookingsForSelected() {
		if (!this.pb || !this.selectedRoomId || !isValidRoomId(this.selectedRoomId)) {
			this.existingBookings = [];
			return;
		}
		this.loadingBookings = true;
		try {
			const safeId = this.selectedRoomId;
			const data = await this.pb.collection("bookings").getFullList({
				filter: `field = "${safeId}"`,
				sort: "start_time",
			});
			const allBookings = data as unknown as Booking[];

			this.existingBookings = allBookings.filter((b) => {
				if (b.status === "cancelled") return false;
				return getBookingDateInBangkok(b.start_time) === this.bookingDate;
			});
		} catch (err) {
			console.error("Failed to load bookings", err);
			this.existingBookings = [];
		} finally {
			this.loadingBookings = false;
		}
	}

	async fetchBookingsForRoomDate(): Promise<Booking[]> {
		if (!this.pb || !this.selectedRoomId || !isValidRoomId(this.selectedRoomId)) {
			return [];
		}
		const safeId = this.selectedRoomId;
		const data = await this.pb.collection("bookings").getFullList({
			filter: `field = "${safeId}"`,
			sort: "start_time",
		});
		const all = data as unknown as Booking[];
		return all.filter((b) => {
			if (b.status === "cancelled") return false;
			return getBookingDateInBangkok(b.start_time) === this.bookingDate;
		});
	}

	async handleSubmit(e: Event) {
		e.preventDefault();
		this.validationError = null;
		this.submitError = null;

		const err = validateForm({
			selectedRoomId: this.selectedRoomId,
			bookingDate: this.bookingDate,
			startTime: this.startTime,
			endTime: this.endTime,
			title: this.title,
			isRecurring: this.isRecurring,
			recurringUntil: this.recurringUntil,
			recurringDays: this.recurringDays,
		});
		if (err) {
			this.validationError = err;
			return;
		}

		if (!this.pb || !isValidRoomId(this.selectedRoomId)) {
			this.submitError = "ระบบไม่พร้อมใช้งาน";
			return;
		}

		this.submitting = true;
		try {
			const fresh = await this.fetchBookingsForRoomDate();
			this.existingBookings = fresh;

			const conflict = checkOverlap(fresh, this.bookingDate, this.startTime, this.endTime);
			if (conflict) {
				const cStart = formatDisplayTime(conflict.start_time);
				const cEnd = formatDisplayTime(conflict.end_time);
				this.validationError = `เวลานี้ชนกับการจอง "${conflict.title}" (${cStart}-${cEnd})`;
				return;
			}

			this.showConfirm = true;
		} catch (err: any) {
			console.error("Validation/Overlap check failed", err);
			this.submitError = err.message || "เกิดข้อผิดพลาดในการตรวจสอบห้อง";
			toast.error("ตรวจสอบข้อมูลไม่สำเร็จ", {
				description: this.submitError ?? "",
			});
		} finally {
			this.submitting = false;
		}
	}

	async executeSubmit() {
		this.submitting = true;
		this.validationError = null;
		this.submitError = null;
		try {
			const response = await fetch("/api/bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					roomId: this.selectedRoomId,
					date: this.bookingDate,
					startTime: this.startTime,
					endTime: this.endTime,
					title: this.title.trim(),
					notes: this.notes.trim(),
					advisorName: this.advisorName.trim(),
					isRecurring: this.isRecurring,
					recurringUntil: this.recurringUntil,
					recurringDays: this.recurringDays,
					customBookerName: this.customBookerName.trim() || undefined,
				}),
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: "ส่งคำขอไม่สำเร็จ" }));
				throw new Error(errorData.message || "เซิร์ฟเวอร์ปฏิเสธการจอง");
			}

			this.submitSuccess = true;
			this.title = "";
			this.notes = "";
			this.advisorName = "";
			this.isRecurring = false;
			this.recurringUntil = "";
			this.customBookerName = "";
			toast.success("ส่งคำขอจองเรียบร้อย", {
				description: "รอผู้ดูแลอนุมัติ",
			});

			this.showConfirm = false;
			await this.loadBookingsForSelected();
		} catch (err: any) {
			console.error("Submit failed", err);
			this.submitError =
				err.message || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
			toast.error("ส่งคำขอไม่สำเร็จ", { description: this.submitError ?? "" });
			this.showConfirm = false;
		} finally {
			this.submitting = false;
		}
	}

	getRoomName(id: string): string {
		return this.rooms.find((r) => r.id === id)?.name ?? "";
	}

	getRoomLocation(id: string): string {
		return this.rooms.find((r) => r.id === id)?.location ?? "";
	}
}
