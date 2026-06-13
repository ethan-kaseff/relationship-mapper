"use client";

import { useCallback } from "react";
import SeatingChart from "@/components/seating/SeatingChart";
import ReuseLayoutButton from "@/components/events/ReuseLayoutButton";
import { SeatingGuest, SeatingLayout } from "@/types/seating";
import { SeatingState } from "@/hooks/useSeatingChart";

interface EventInvite {
  id: string;
  peopleId: string | null;
  rsvpStatus: string;
  meal: string;
  dietary: string[];
  notes: string | null;
  group: string;
  tableId: string | null;
  seatIndex: number | null;
  isGuest: boolean;
  isPlaceholder: boolean;
  guestName: string | null;
  ticketType: string;
  tableRequest: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    partnerRoles: {
      partner: {
        organizationType: {
          typeName: string;
          officeColors: { officeId: string; color: string }[];
        } | null;
      };
    }[];
  } | null;
}

interface EventData {
  id: string;
  title: string;
  officeId: string;
  seatingLayout: unknown;
  invites: EventInvite[];
}

interface SeatingChartWrapperProps {
  event: EventData;
  onRefresh: () => void;
}

export default function SeatingChartWrapper({ event, onRefresh }: SeatingChartWrapperProps) {
  // Only confirmed (YES) guests appear in the seating chart
  const confirmedInvites = event.invites.filter((inv) => inv.rsvpStatus === "YES");

  const guests: SeatingGuest[] = confirmedInvites.map((inv) => ({
    id: inv.id, // Use invite ID as the seating guest ID
    name: inv.isPlaceholder
      ? "TBD"
      : inv.isGuest && inv.guestName
      ? inv.guestName
      : inv.person
      ? `${inv.person.firstName} ${inv.person.lastName}`
      : "Unknown",
    meal: inv.meal,
    dietary: Array.isArray(inv.dietary) ? inv.dietary : [],
    notes: inv.notes || "",
    group: inv.group || "",
    tableId: inv.tableId,
    seatIndex: inv.seatIndex,
    isGuest: inv.isGuest,
    isPlaceholder: inv.isPlaceholder,
    ticketType: inv.ticketType,
    tableRequest: inv.tableRequest,
    partnerOrgColor: inv.person?.partnerRoles
      ?.map((r) => r.partner?.organizationType?.officeColors.find((c) => c.officeId === event.officeId)?.color)
      .find(Boolean) ?? undefined,
    partnerOrgName: inv.person?.partnerRoles
      ?.map((r) => {
        const color = r.partner?.organizationType?.officeColors.find((c) => c.officeId === event.officeId)?.color;
        return color ? r.partner?.organizationType?.typeName : undefined;
      })
      .find(Boolean) ?? undefined,
  }));

  const layout = event.seatingLayout as SeatingLayout | null;

  const handleSave = useCallback(async (state: SeatingState) => {
    const seatingLayout: SeatingLayout = {
      tables: state.tables,
      objects: state.objects,
      floorWidth: state.floorSize.width,
      floorHeight: state.floorSize.height,
      zoom: state.zoom,
    };

    const seatAssignments = state.guests.map((g) => ({
      inviteId: g.id,
      tableId: g.tableId,
      seatIndex: g.seatIndex,
    }));

    await fetch(`/api/events/${event.id}/seating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatingLayout, seatAssignments }),
    });
  }, [event.id]);

  // Only offer the layout import while the room is still empty — once tables
  // exist, importing is hidden so it can never wipe out seating work.
  const hasTables = !!(layout && Array.isArray(layout.tables) && layout.tables.length > 0);

  return (
    <div>
      {!hasTables && (
        <div className="mb-2 flex justify-end print-hide">
          <ReuseLayoutButton eventId={event.id} onImported={onRefresh} />
        </div>
      )}
      <SeatingChart layout={layout} guests={guests} onSave={handleSave} />
    </div>
  );
}
