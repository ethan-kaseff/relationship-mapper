'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, SeatingGuest } from '@/types/seating';
import { GROUP_COLORS, PIXELS_PER_FOOT, DEFAULT_TABLE_DIAMETER_FT } from '@/lib/seating-constants';

interface TableModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; seatCount: number; shape: Table['shape']; widthFt: number; heightFt: number; id?: string; preselectedGuestIds?: string[]; tableCount?: number }) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  unassignedGuests?: SeatingGuest[];
}

export default function SeatingTableModal({
  table, isOpen, onClose, onSave, onDelete, onDuplicate, unassignedGuests,
}: TableModalProps) {
  const [name, setName] = useState('');
  const [seatCount, setSeatCount] = useState(8);
  const [tableCount, setTableCount] = useState(1);
  const [shape, setShape] = useState<Table['shape']>('round');
  const [widthFt, setWidthFt] = useState(DEFAULT_TABLE_DIAMETER_FT);
  const [heightFt, setHeightFt] = useState(DEFAULT_TABLE_DIAMETER_FT);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());

  const showTwoDimensions = shape === 'rectangle' || shape === 'oval';

  useEffect(() => {
    if (table) {
      setName(table.name);
      setSeatCount(table.seats.length);
      setShape(table.shape || 'round');
      setWidthFt(table.width ? table.width / PIXELS_PER_FOOT : DEFAULT_TABLE_DIAMETER_FT);
      setHeightFt(table.height ? table.height / PIXELS_PER_FOOT : DEFAULT_TABLE_DIAMETER_FT);
    } else {
      setName('');
      setSeatCount(8);
      setTableCount(1);
      setShape('round');
      setWidthFt(DEFAULT_TABLE_DIAMETER_FT);
      setHeightFt(DEFAULT_TABLE_DIAMETER_FT);
    }
    setSelectedGuestIds(new Set());
  }, [table, isOpen]);

  const guestsByGroup = useMemo(() => {
    if (!unassignedGuests || table) return {};
    const groups: Record<string, SeatingGuest[]> = {};
    unassignedGuests.forEach((g) => {
      const key = g.group || '(No Group)';
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });
    return groups;
  }, [unassignedGuests, table]);

  const groupColorMap = useMemo(() => {
    const allGroups = Object.keys(guestsByGroup).filter((g) => g !== '(No Group)').sort();
    const map: Record<string, string> = {};
    allGroups.forEach((group, i) => { map[group] = GROUP_COLORS[i % GROUP_COLORS.length]; });
    return map;
  }, [guestsByGroup]);

  const toggleGuest = (guestId: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      if (next.size > seatCount) setSeatCount(next.size);
      return next;
    });
  };

  const toggleGroup = (groupGuests: SeatingGuest[]) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      const allSelected = groupGuests.every((g) => next.has(g.id));
      if (allSelected) groupGuests.forEach((g) => next.delete(g.id));
      else groupGuests.forEach((g) => next.add(g.id));
      if (next.size > seatCount) setSeatCount(next.size);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveHeightFt = showTwoDimensions ? heightFt : widthFt;
    if (!table && tableCount > 1) {
      onSave({ name: name.trim() || 'Table', seatCount, shape, widthFt, heightFt: effectiveHeightFt, tableCount });
    } else {
      onSave({
        id: table?.id,
        name: name.trim(),
        seatCount,
        shape,
        widthFt,
        heightFt: effectiveHeightFt,
        preselectedGuestIds: !table && selectedGuestIds.size > 0 ? Array.from(selectedGuestIds) : undefined,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const showGuestSelection = !table && tableCount === 1 && unassignedGuests && unassignedGuests.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl shadow-xl w-full mx-4 ${showGuestSelection ? 'max-w-lg max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {table ? 'Edit Table' : 'Add Table'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Table 1, Head Table"
              />
            </div>
            {!table && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Tables</label>
                <input
                  type="number" value={tableCount}
                  onChange={(e) => setTableCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  min={1} max={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {tableCount > 1 && (
                  <p className="text-xs text-gray-500 mt-1">Tables will be named {name.trim() || 'Table'} 1, {name.trim() || 'Table'} 2, etc. and auto-arranged</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seats per Table</label>
              <input
                type="number" value={seatCount}
                onChange={(e) => setSeatCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                min={1} max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shape</label>
              <div className="flex gap-2">
                {([
                  { value: 'round', label: 'Circle' },
                  { value: 'square', label: 'Square' },
                  { value: 'rectangle', label: 'Rectangle' },
                  { value: 'oval', label: 'Oval' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setShape(opt.value);
                      if (opt.value === 'round' || opt.value === 'square') {
                        setHeightFt(widthFt);
                      }
                    }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg border ${
                      shape === opt.value
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {showTwoDimensions ? 'Width (ft)' : 'Size (ft)'}
                </label>
                <input
                  type="number"
                  value={widthFt}
                  onChange={(e) => {
                    const v = Math.max(2, Math.min(30, parseFloat(e.target.value) || 2));
                    setWidthFt(v);
                    if (!showTwoDimensions) setHeightFt(v);
                  }}
                  min={2} max={30} step={0.5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {showTwoDimensions && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (ft)</label>
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => setHeightFt(Math.max(2, Math.min(30, parseFloat(e.target.value) || 2)))}
                    min={2} max={30} step={0.5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {showGuestSelection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre-assign Guests ({selectedGuestIds.size} selected)
                </label>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {Object.entries(guestsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupGuests]) => {
                    const allSelected = groupGuests.every((g) => selectedGuestIds.has(g.id));
                    const someSelected = groupGuests.some((g) => selectedGuestIds.has(g.id));
                    const gColor = groupColorMap[group];
                    return (
                      <div key={group}>
                        <button
                          type="button" onClick={() => toggleGroup(groupGuests)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-100"
                        >
                          <input type="checkbox" checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            readOnly className="rounded"
                          />
                          <span className="px-1.5 py-0.5 rounded text-xs"
                            style={gColor ? { backgroundColor: `${gColor}20`, color: gColor } : undefined}
                          >{group}</span>
                          <span className="text-gray-400 text-xs">({groupGuests.length})</span>
                        </button>
                        {groupGuests.map((guest) => (
                          <label key={guest.id}
                            className="flex items-center gap-2 px-3 py-1.5 pl-8 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50"
                          >
                            <input type="checkbox" checked={selectedGuestIds.has(guest.id)}
                              onChange={() => toggleGuest(guest.id)} className="rounded"
                            />
                            <span className="text-gray-700">{guest.name}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {table && onDelete && (
                <button type="button" onClick={() => { if (confirm('Delete this table?')) { onDelete(); onClose(); } }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
              )}
              {table && onDuplicate && (
                <button type="button" onClick={() => { onDuplicate(); onClose(); }}
                  className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50">Duplicate</button>
              )}
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {table ? 'Save Changes' : tableCount > 1 ? `Add ${tableCount} Tables` : 'Add Table'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
