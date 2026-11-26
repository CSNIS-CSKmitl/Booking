export interface BookingNotificationDetails {
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  notes?: string;
  bookerName: string;
  bookerEmail: string;
  bookerRole: string;
  advisorName?: string;
  advisorEmail?: string;
  datesCount?: number;
}
