'use client';

import { useState, useMemo } from 'react';
import { SeatingGuest, Table } from '@/types/seating';
import { GROUP_COLORS } from '@/lib/seating-constants';

interface GuestSidebarProps {
  guests: SeatingGuest[];
  tables: Table[];
  selectedGuestId: string | null;
  selectedSeatInfo: { tableId: string; seatIndex: number } | null;
  onGuestSelect: (guestId: string | null) => void;
  onGuestEdit: (guest: SeatingGuest) => void;
  onUnassign: (guestId: string) => void;
}

export default function GuestSidebar({
  guests, tables, selectedGuestId, selectedSeatInfo,
  onGuestSelect, onGuestEdit, onUnassign,
}: GuestSidebarProps) {
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const groupColorMap = useMemo(() => {
    const allGroups = Array.from(new Set(guests.map((g) => g.group).filter(Boolean))).sort();
    const map: Record<string, string> = {};
    allGroups.forEach((group, i) => { map[group] = GROUP_COLORS[i % GROUP_COLORS.length]; });
    return map;
  }, [guests]);

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unassigned' && !guest.tableId) ||
      (filter === 'assigned' && guest.tableId);
    return matchesSearch && matchesFilter;
  });

  const getTableName = (tableId: string | null) => {
    if (!tableId) return null;
    return tables.find((t) => t.id === tableId)?.name || null;
  };

  const unassignedCount = guests.filter((g) => !g.tableId).length;
  const assignedCount = guests.filter((g) => g.tableId).length;

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const guestsByTable = useMemo(() => {
    const map: Record<string, SeatingGuest[]> = {};
    tables.forEach((t) => { map[t.id] = []; });
    guests.forEach((g) => { if (g.tableId && map[g.tableId]) map[g.tableId].push(g); });
    return map;
  }, [guests, tables]);

  const unassignedGuests = filteredGuests.filter((g) => !g.tableId);
  const showUnassignedList = filter === 'all' || filter === 'unassigned';
  const showTableSections = filter === 'all' || filter === 'assigned';

  const renderGuestCard = (guest: SeatingGuest, hideTableName = false) => {
    const isSelected = selectedGuestId === guest.id;
    const tableName = getTableName(guest.tableId);
    const canAssignToSeat = selectedSeatInfo && !guest.tableId;
    const groupColor = guest.group ? groupColorMap[guest.group] : null;

    return (
      <div
        key={guest.id}
        draggable={!guest.tableId}
        onDragStart={(e) => {
          if (!guest.tableId) {
            e.dataTransfer.setData('guestId', guest.id);
            e.dataTransfer.effectAllowed = 'move';
            const el = document.createElement('div');
            el.textContent = guest.name.charAt(0).toUpperCase();
            Object.assign(el.style, {
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#374151', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '600', position: 'absolute', top: '-9999px',
            });
            document.body.appendChild(el);
            e.dataTransfer.setDragImage(el, 14, 14);
            requestAnimationFrame(() => document.body.removeChild(el));
          }
        }}
        className={`guest-card p-2 rounded-lg border cursor-pointer ${
          !guest.tableId ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50'
            : canAssignToSeat
            ? 'border-green-400 bg-green-50 hover:bg-green-100'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => onGuestSelect(isSelected ? null : guest.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{guest.name}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {guest.group && (
                <span
                  className="inline-block px-1.5 py-0.5 text-xs rounded font-medium"
                  style={{
                    backgroundColor: groupColor ? `${groupColor}20` : '#eef2ff',
                    color: groupColor || '#4338ca',
                    border: `1px solid ${groupColor ? `${groupColor}40` : '#c7d2fe'}`,
                  }}
                >
                  {guest.group}
                </span>
              )}
              {guest.meal !== 'Standard' && (
                <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                  {guest.meal}
                </span>
              )}
              {guest.dietary.length > 0 && (
                <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                  {guest.dietary.length} dietary
                </span>
              )}
            </div>
            {tableName && !hideTableName && (
              <p className="text-xs text-green-600 mt-1">Seated at {tableName}</p>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            {guest.tableId && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(guest.id); }}
                className="p-1 text-gray-400 hover:text-orange-500"
                title="Unassign"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onGuestEdit(guest); }}
              className="p-1 text-gray-400 hover:text-indigo-500"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-80 bg-white border-l border-gray-200 flex flex-col h-full"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const guestId = e.dataTransfer.getData('guestId');
        if (guestId) {
          const guest = guests.find((g) => g.id === guestId);
          if (guest?.tableId) onUnassign(guestId);
        }
      }}
    >
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Guests (RSVP Yes)</h2>
        <input
          type="text"
          placeholder="Search guests..."
          aria-label="Search guests by name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <div className="flex gap-2 mt-3">
          {[
            { key: 'all' as const, label: `All (${guests.length})`, active: 'bg-indigo-100 text-indigo-700' },
            { key: 'unassigned' as const, label: `Unassigned (${unassignedCount})`, active: 'bg-orange-100 text-orange-700' },
            { key: 'assigned' as const, label: `Seated (${assignedCount})`, active: 'bg-green-100 text-green-700' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded ${
                filter === f.key ? f.active : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredGuests.length === 0 && !showTableSections ? (
          <p className="text-gray-500 text-sm text-center py-8">No guests found</p>
        ) : (
          <div className="space-y-2">
            {showUnassignedList && unassignedGuests.length > 0 && (
              <>
                {filter === 'all' && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Unassigned ({unassignedGuests.length})
                  </p>
                )}
                {unassignedGuests.map((g) => renderGuestCard(g))}
              </>
            )}

            {showTableSections && tables.length > 0 && (
              <>
                {filter === 'all' && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-1">
                    Seated by Table
                  </p>
                )}
                {tables.map((table) => {
                  const tableGuests = (guestsByTable[table.id] || []).filter((g) =>
                    g.name.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  if (tableGuests.length === 0 && searchTerm) return null;
                  const isExpanded = expandedTables.has(table.id);

                  return (
                    <div key={table.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleTable(table.id)}
                        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-500" />
                          <span className="font-medium text-gray-700">{table.name}</span>
                          <span className="text-gray-400">
                            ({(guestsByTable[table.id] || []).length}/{table.seats.length})
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="p-2 space-y-1">
                          {tableGuests.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">No guests</p>
                          ) : (
                            tableGuests.map((g) => renderGuestCard(g, true))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {filter === 'unassigned' && unassignedGuests.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No unassigned guests</p>
            )}
          </div>
        )}
      </div>

      {selectedSeatInfo && (
        <div className="p-4 bg-green-50 border-t border-green-200">
          <p className="text-sm text-green-700">
            Seat selected. Click an unassigned guest to place them here.
          </p>
        </div>
      )}
      {selectedGuestId && !selectedSeatInfo && (
        <div className="p-4 bg-indigo-50 border-t border-indigo-200">
          <p className="text-sm text-indigo-700">
            Click an empty seat to assign the selected guest
          </p>
        </div>
      )}
    </div>
  );
}
