"use client";

import { MEAL_OPTIONS, DIETARY_OPTIONS } from "@/lib/seating-constants";

interface DietaryOptionRecord { id: string; name: string; }

const TICKET_TYPES = ["Regular", "Comp", "Press", "Staff", "VIP"] as const;
const RSVP_OPTIONS = ["YES", "PENDING", "MAYBE", "NO"] as const;

const RSVP_ACTIVE: Record<string, string> = {
  YES: "bg-green-100 border-green-400 text-green-700",
  NO: "bg-red-100 border-red-400 text-red-700",
  MAYBE: "bg-yellow-100 border-yellow-400 text-yellow-700",
  PENDING: "bg-gray-200 border-gray-400 text-gray-700",
};

interface InviteOptionsPanelProps {
  rsvpStatus: string;
  onRsvpChange: (v: string) => void;
  meal: string;
  onMealChange: (v: string) => void;
  dietary: string[];
  onDietaryChange: (v: string[]) => void;
  ticketType: string;
  onTicketTypeChange: (v: string) => void;
  seatingRequest: string;
  onSeatingRequestChange: (v: string) => void;
  tableRequest: string;
  onTableRequestChange: (v: string) => void;
  groups: string[];
  customDietary: DietaryOptionRecord[];
  showRsvp?: boolean;
}

export default function InviteOptionsPanel({
  rsvpStatus, onRsvpChange,
  meal, onMealChange,
  dietary, onDietaryChange,
  ticketType, onTicketTypeChange,
  seatingRequest, onSeatingRequestChange,
  tableRequest, onTableRequestChange,
  groups,
  customDietary,
  showRsvp = true,
}: InviteOptionsPanelProps) {
  const builtInSet = new Set(DIETARY_OPTIONS);
  const allDietary = [
    ...DIETARY_OPTIONS,
    ...customDietary.filter((o) => !builtInSet.has(o.name)).map((o) => o.name),
  ];

  function toggleDietary(opt: string) {
    onDietaryChange(dietary.includes(opt) ? dietary.filter((d) => d !== opt) : [...dietary, opt]);
  }

  return (
    <div className="space-y-2.5">
      {/* RSVP */}
      {showRsvp && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 w-24 shrink-0">RSVP</span>
          <div className="flex gap-1.5 flex-wrap">
            {RSVP_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onRsvpChange(s)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  rsvpStatus === s ? RSVP_ACTIVE[s] : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Type */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 w-24 shrink-0">Ticket Type</span>
        <div className="flex gap-1.5 flex-wrap">
          {TICKET_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTicketTypeChange(t)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                ticketType === t
                  ? "bg-indigo-100 border-indigo-400 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Meal */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 w-24 shrink-0">Meal</span>
        <select
          value={meal}
          onChange={(e) => onMealChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
        >
          {MEAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Dietary Restrictions */}
      <div className="flex gap-2">
        <span className="text-xs font-medium text-gray-600 w-24 shrink-0 pt-0.5">Dietary</span>
        <div className="flex flex-wrap gap-1.5">
          {allDietary.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleDietary(opt)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                dietary.includes(opt)
                  ? "bg-red-100 border-red-300 text-red-700"
                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table Request */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 w-24 shrink-0">Table Request</span>
          <select
            value={tableRequest}
            onChange={(e) => onTableRequestChange(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">No preference</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      {/* Special Request */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 w-24 shrink-0">Special Request</span>
        <input
          type="text"
          value={seatingRequest}
          onChange={(e) => onSeatingRequestChange(e.target.value)}
          placeholder="e.g., accessibility needs, near the stage..."
          className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
