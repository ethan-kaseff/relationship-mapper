"use client";

import { useCallback, useRef } from "react";
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
  seatingRequest: string | null;
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
    seatingRequest: inv.seatingRequest,
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

  // Tracks the last payload we refreshed the page for, so the chart's own
  // re-saves (after a refresh re-syncs it) don't trigger an endless refresh loop.
  const lastSavedKeyRef = useRef<string>("");

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

    const body = JSON.stringify({ seatingLayout, seatAssignments });
    const res = await fetch(`/api/events/${event.id}/seating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) return;

    // Keep the rest of the page in sync — the Invite tab reads seat assignments
    // and table names from the event, so without this it shows a stale snapshot
    // until a manual reload. Only refresh when the saved data actually changed.
    // The chart preserves its own assignments across a refresh (SYNC_GUESTS), so
    // this never disturbs in-progress seating.
    if (body !== lastSavedKeyRef.current) {
      lastSavedKeyRef.current = body;
      onRefresh();
    }
  }, [event.id, onRefresh]);

  // Persist a guest's editable details from the seating popup to the invite
  // record. The seating save above only writes table/seat positions, so without
  // this those detail edits (incl. table/seating requests) would be lost.
  const handleGuestDetailsSave = useCallback(async (inviteId: string, updates: {
    group: string; meal: string; dietary: string[]; notes: string;
    ticketType: string; seatingRequest: string; tableRequest: string;
  }) => {
    const res = await fetch(`/api/events/${event.id}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group: updates.group,
        meal: updates.meal,
        dietary: updates.dietary,
        notes: updates.notes || null,
        ticketType: updates.ticketType,
        seatingRequest: updates.seatingRequest || null,
        tableRequest: updates.tableRequest || null,
      }),
    });
    if (res.ok) onRefresh();
  }, [event.id, onRefresh]);

  // Top up missing TBD seats for each sponsor (to their "Using" count) on the
  // server, then refresh so the new seats appear in the chart. Returns how many
  // placeholders were created so the chart knows whether to wait for a sync.
  const handleReconcileSeats = useCallback(async (): Promise<number> => {
    const res = await fetch(`/api/events/${event.id}/reconcile-seats`, { method: "POST" });
    if (!res.ok) return 0;
    const data = await res.json().catch(() => null);
    const created = data?.created ?? 0;
    // Only refetch when we actually added seats. Refetching otherwise can pull
    // stale server seating back over a just-cleared chart before Auto-Seat runs.
    if (created > 0) onRefresh();
    return created;
  }, [event.id, onRefresh]);

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
      <SeatingChart layout={layout} guests={guests} onSave={handleSave} onGuestSave={handleGuestDetailsSave} onReconcileSeats={handleReconcileSeats} />
    </div>
  );
}
