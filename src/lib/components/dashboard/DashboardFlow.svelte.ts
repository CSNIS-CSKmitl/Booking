import { isValidRoomId, escapeFilterValue, generateMonthGridStructure } from "$lib/utils/dashboard-helpers";
import PocketBase from "pocketbase";
import type { Room } from "$lib/types";
import { goto } from "$app/navigation";

export class DashboardFlow {
	selectedRoomId = $state<string>("");
	calendarDays = $state<any[]>([]);
	clockText = $state("");
	dateText = $state("");
	rawRooms = $state<Room[]>([]);
	selectedYear = $state(new Date().getFullYear());
	selectedMonth = $state(new Date().getMonth());

	pb: PocketBase | null = null;

	monthNames = [
		"มกราคม",
		"กุมภาพันธ์",
		"มีนาคม",
		"เมษายน",
		"พฤษภาคม",
		"มิถุนายน",
		"กรกฎาคม",
		"สิงหาคม",
		"กันยายน",
		"ตุลาคม",
		"พฤศจิกายน",
		"ธันวาคม",
	];

	currentRoomName = $derived(
		this.rawRooms.find((r) => r.id === this.selectedRoomId)?.name ??
			"กำลังโหลดข้อมูลห้อง..."
	);

	displayMonthName = $derived(
		new Date(this.selectedYear, this.selectedMonth, 1).toLocaleDateString("th-TH", {
			month: "long",
			year: "numeric",
		})
	);

	prevMonth() {
		if (this.selectedMonth === 0) {
			this.selectedMonth = 11;
			this.selectedYear -= 1;
		} else {
			this.selectedMonth -= 1;
		}
	}

	nextMonth() {
		if (this.selectedMonth === 11) {
			this.selectedMonth = 0;
			this.selectedYear += 1;
		} else {
			this.selectedMonth += 1;
		}
	}

	goToCurrentMonth() {
		const now = new Date();
		this.selectedMonth = now.getMonth();
		this.selectedYear = now.getFullYear();
	}

	handleRoomChange(value: string | undefined) {
		if (value) goto(`/dashboard/${value}`);
	}

	updateClock() {
		const now = new Date();
		this.clockText = now.toLocaleTimeString("th-TH", {
			hour12: false,
			hourCycle: "h23",
		});
		this.dateText = now.toLocaleDateString("th-TH", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	}

	async fetchAndRender(roomId: string, pocketbaseUrl: string): Promise<boolean> {
		if (!this.pb) this.pb = new PocketBase(pocketbaseUrl);
		try {
			if (this.rawRooms.length === 0) {
				const rooms = await this.pb.collection("rooms").getFullList<Room>({ sort: "name" });
				this.rawRooms = rooms;
			}

			if (!isValidRoomId(roomId)) {
				console.warn(`Invalid roomId format: ${roomId}`);
				return false;
			}
			const safeRoomId = escapeFilterValue(roomId);

			const res = await fetch(`/api/rooms/${safeRoomId}/bookings`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();

			this.calendarDays = generateMonthGridStructure(
				this.rawRooms,
				data.bookings ?? [],
				this.selectedYear,
				this.selectedMonth,
				roomId
			);
			return true;
		} catch (err) {
			console.error("[dashboard flow] fetch bookings failed:", err);
			return false;
		}
	}
}
