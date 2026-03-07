export type RsvpStatus = "PENDING" | "YES" | "NO" | "MAYBE";

export interface SeatingGuest {
  id: string; // EventInvite id
  name: string;
  meal: string;
  dietary: string[];
  notes: string;
  group: string;
  tableId: string | null;
  seatIndex: number | null;
}

export interface Seat {
  guestId: string | null;
}

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  shape: "round" | "rectangle" | "oval";
  seats: Seat[];
  width: number;
  height: number;
  rotation: number;
}

export interface VenueObject {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}

export interface SeatingLayout {
  tables: Table[];
  objects: VenueObject[];
  floorWidth: number;
  floorHeight: number;
  zoom: number;
}

export interface SeatingData {
  layout: SeatingLayout;
  guests: SeatingGuest[];
}
