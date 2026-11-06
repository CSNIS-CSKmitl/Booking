import {
  isValidRoomId,
  escapeFilterValue,
  mapRecord,
  mapRoom,
  calculateDerivedState,
} from "$lib/utils/room-helpers";
import PocketBase from "pocketbase";
import QRCode from "qrcode";
import type { BookingItem, BookingViewState } from "$lib/types";

export class RoomFlow {
  clockText = $state("");
  dateText = $state("");
  qrCodeDataUrl = $state("");
  bookings = $state<BookingItem[]>([]);
  roomName = $state("CONFERENCE ROOM 01");
  roomLocation = $state("อาคารอเนกประสงค์ ชั้น 3");
  currentBooking = $state<BookingItem>({
    id: "empty",
    title: "ว่าง",
    detailLabel: "-",
    startTime: "",
    endTime: "",
    status: "cancelled",
    bookerName: "-",
  });
  upcomingBookings = $state<BookingItem[]>([]);
  progressPercent = $state(0);
  progressNote = $state("");
  bookingViewState = $state<BookingViewState>("idle");
  statusLabel = $state("DEMO MODE");

  pb: PocketBase | null = null;

  updateClock(currentRoomId: string) {
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
    this.updateDerivedState(currentRoomId);
  }

  updateDerivedState(currentRoomId: string) {
    const nowVal = Date.now();
    const state = calculateDerivedState(nowVal, this.bookings, currentRoomId);
    this.bookingViewState = state.bookingViewState;
    this.currentBooking = state.currentBooking;
    this.upcomingBookings = state.upcomingBookings;
    this.progressPercent = state.progressPercent;
    this.progressNote = state.progressNote;
  }

  async generateQrCode() {
    try {
      const bookUrl = `${window.location.origin}/book`;
      this.qrCodeDataUrl = await QRCode.toDataURL(bookUrl, {
        width: 280,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    } catch (err) {
      console.error("Failed to generate QR Code", err);
    }
  }

  async initRealtimeSystem(
    currentRoomId: string,
    pocketbaseUrl: string,
    defaultRoomName: string,
    defaultRoomLocation: string,
    defaultBookingUrl: string,
    onDestroyed: () => boolean,
  ) {
    if (!pocketbaseUrl) {
      this.statusLabel = "DEMO MODE";
      await this.generateQrCode();
      return;
    }

    if (!isValidRoomId(currentRoomId)) {
      console.warn(`Invalid roomId: ${currentRoomId}`);
      this.statusLabel = "INVALID ROOM";
      return;
    }
    const safeRoomId = escapeFilterValue(currentRoomId);

    try {
      this.pb = new PocketBase(pocketbaseUrl);
      const room = await this.pb.collection("rooms").getOne(safeRoomId);
      if (!onDestroyed()) {
        const mappedRoom = mapRoom(
          room,
          defaultRoomName,
          defaultRoomLocation,
          defaultBookingUrl,
        );
        this.roomName = mappedRoom.name;
        this.roomLocation = mappedRoom.location;
      }
    } catch (err) {
      console.error(`หาห้องไอดี ${currentRoomId} ไม่เจอในระบบ`, err);
    }

    const POLL_INTERVAL_MS = 15_000;
    let pollTimer: number | null = null;

    const fetchAndSetBookings = async () => {
      if (onDestroyed()) return;
      try {
        const res = await fetch(`/api/rooms/${safeRoomId}/bookings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (onDestroyed()) return;
        this.bookings = (data.bookings ?? []).map((rec: any) => mapRecord(rec));
        this.statusLabel = "LIVE";
        this.updateDerivedState(currentRoomId);
        await this.generateQrCode();
      } catch (err) {
        console.error("[room display] Failed to sync bookings:", err);
      }
    };

    await fetchAndSetBookings();
    pollTimer = window.setInterval(fetchAndSetBookings, POLL_INTERVAL_MS);

    (window as any).__roomPollTimer = pollTimer;
  }
}
