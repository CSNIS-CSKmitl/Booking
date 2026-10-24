export interface Booking {
	id: string;
	title: string;
	start_time: string;
	end_time: string;
	date?: string;
	status: string;
	field: string;
	bookerName?: string;
	bookerEmail?: string;
	booker_email?: string;
	detailLabel?: string;
	advisorName?: string;
}

export interface BookingItem {
	id: string;
	title: string;
	detailLabel: string;
	advisorName?: string;
	startTime: string;
	startEpoch?: number | null;
	endTime: string;
	endEpoch?: number | null;
	status: 'confirmed' | 'pending' | 'cancelled';
	bookerName: string;
	bookerEmail?: string;
	booker_email?: string;
}

export type BookingRecord = Record<string, unknown> & {
	expand?: {
		field?: {
			name?: unknown;
		};
	};
};

export type BookingViewState = 'active' | 'idle';

