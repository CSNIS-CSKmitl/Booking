export interface Room {
  id: string;
  name: string;
  location?: string;
  seats?: number;
  image_url?: string;
  booking_url?: string;
}

export interface RoomItem {
  name: string;
  location: string;
  booking_url: string;
  seats?: number;
  image_url?: string;
}
