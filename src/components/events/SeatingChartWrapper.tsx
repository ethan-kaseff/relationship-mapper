"use client";

import { useCallback } from "react";
import SeatingChart from "@/components/seating/SeatingChart";
import { SeatingGuest, SeatingLayout } from "@/types/seating";
import { SeatingState } from "@/hooks/useSeatingChart";

interface EventInvite {
  id: string;
  peopleId: string;
  rsvpStatus: string;
  meal: string;
  dietary: string[];
  notes: string | null;
  group: string;
  tableId: string | null;
  seatIndex: number | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface EventData {
  id: string;
  title: string;
  seatingLayout: unknown;
  invites: EventInvite[];
}

interface SeatingChartWrapperProps {
  event: EventData;
  onRefresh: () => void;
}

export default function SeatingChartWrapper({ event }: SeatingChartWrapperProps) {
  // Only confirmed (YES) guests appear in the seating chart
  const confirmedInvites = event.invites.filter((inv) => inv.rsvpStatus === "YES");

  const guests: SeatingGuest[] = confirmedInvites.map((inv) => ({
    id: inv.id, // Use invite ID as the seating guest ID
    name: `${inv.person.firstName} ${inv.person.lastName}`,
    meal: inv.meal,
    dietary: Array.isArray(inv.dietary) ? inv.dietary : [],
    notes: inv.notes || "",
    group: inv.group || "",
    tableId: inv.tableId,
    seatIndex: inv.seatIndex,
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

  if (confirmedInvites.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 mb-2">No confirmed guests yet.</p>
        <p className="text-sm text-gray-400">
          Mark invitees as &quot;Yes&quot; on the Invites tab to start planning seating.
        </p>
      </div>
    );
  }

  return <SeatingChart layout={layout} guests={guests} onSave={handleSave} />;
}
