'use client';

import { useState, useCallback, useRef } from 'react';
import { SeatingGuest, Table, VenueObject, SeatingLayout } from '@/types/seating';
import { useSeatingChart, SeatingState } from '@/hooks/useSeatingChart';
import FloorPlan from './FloorPlan';
import FloorControls from './FloorControls';
import GuestSidebar from './GuestSidebar';
import GuestModal from './GuestModal';
import SeatingTableModal from './TableModal';
import ObjectModal from './ObjectModal';
import { VENUE_OBJECT_TYPES } from '@/lib/seating-constants';

const OBJECT_ICONS: Record<string, string> = {
  stage: '🎭', bar: '🍸', dancefloor: '💃', entrance: '🚪',
  buffet: '🍽️', dj: '🎧', photobooth: '📸', restrooms: '🚻',
  kitchen: '👨‍🍳', custom: '📦',
};

interface SeatingChartProps {
  layout: SeatingLayout | null;
  guests: SeatingGuest[];
  onSave: (state: SeatingState) => Promise<void>;
}

export default function SeatingChart({ layout, guests, onSave }: SeatingChartProps) {
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedSeatInfo, setSelectedSeatInfo] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [objectModalOpen, setObjectModalOpen] = useState(false);
  const [showObjectMenu, setShowObjectMenu] = useState(false);
  const [editingGuest, setEditingGuest] = useState<SeatingGuest | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingObject, setEditingObject] = useState<VenueObject | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showCenterLines, setShowCenterLines] = useState(true);
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
  const [pendingAutoAction, setPendingAutoAction] = useState<string | null>(null);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const floorContainerRef = useRef<HTMLDivElement>(null);
  const floorViewRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(async (data: SeatingState) => {
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  }, [onSave]);

  const {
    state, addTable, setTables, updateTable, deleteTable, updateGuest,
    assignGuest, unassignGuest, addObject, updateObject, deleteObject,
    setZoom, setFloorSize, getTableById, undo, redo, canUndo, canRedo,
  } = useSeatingChart(layout, guests, handleSave);

  const computeArrangedTables = useCallback((tables: Table[], options: {
    layout: 'grid' | 'staggered'; spacing: number; objectSpacing: number; maxCols: number;
  }): Table[] => {
    if (tables.length === 0) return tables;
    const { layout: layoutType, spacing, objectSpacing, maxCols } = options;
    const tableBody = 50;
    const tableCount = tables.length;
    const margin = 50;

    const objectBounds = state.objects.map((obj) => {
      const pad = obj.padding || { top: 0, right: 0, bottom: 0, left: 0 };
      return {
        left: obj.x - Math.max(pad.left, objectSpacing),
        top: obj.y - Math.max(pad.top, objectSpacing),
        right: obj.x + obj.width + Math.max(pad.right, objectSpacing),
        bottom: obj.y + obj.height + Math.max(pad.bottom, objectSpacing),
      };
    });

    const overlapsObject = (x: number, y: number) =>
      objectBounds.some(
        (b) => x + tableBody > b.left && x - tableBody < b.right && y + tableBody > b.top && y - tableBody < b.bottom
      );

    const rowH = layoutType === 'staggered' ? spacing * 0.866 : spacing;
    const floorW = state.floorSize.width;
    const floorH = state.floorSize.height;

    const maxFitCols = Math.max(1, Math.floor((floorW - 2 * margin) / spacing) + 1);

    const findSlots = (cols: number): { x: number; y: number }[] => {
      const slots: { x: number; y: number }[] = [];
      const scanStep = rowH / 2;
      let y = margin;
      let placedRows = 0;
      let lastPlacedY = -Infinity;

      while (slots.length < tableCount && y <= floorH - margin) {
        if (y - lastPlacedY < rowH - 1) { y += scanStep; continue; }
        const isOddRow = layoutType === 'staggered' && placedRows % 2 === 1;
        const stagger = isOddRow ? spacing / 2 : 0;
        const rowW = (cols - 1) * spacing;
        const startX = (floorW - rowW) / 2 + stagger;

        const rowSlots: { x: number; y: number }[] = [];
        for (let col = 0; col < cols; col++) {
          const x = startX + col * spacing;
          if (x < margin || x > floorW - margin || y < margin || y > floorH - margin) continue;
          if (!overlapsObject(x, y)) rowSlots.push({ x, y });
        }

        if (rowSlots.length > 0) {
          rowSlots.forEach((s) => slots.push(s));
          placedRows++;
          lastPlacedY = y;
          y += rowH;
        } else {
          y += scanStep;
        }
      }
      return slots;
    };

    // Try increasing column counts until all tables fit
    let cols2: number;
    let slots: { x: number; y: number }[];

    if (maxCols > 0) {
      cols2 = maxCols;
      slots = findSlots(cols2);
    } else {
      const idealCols = Math.ceil(Math.sqrt(tableCount));
      cols2 = Math.min(idealCols, maxFitCols);
      slots = findSlots(cols2);

      // If not enough slots, increase columns until they fit
      while (slots.length < tableCount && cols2 < maxFitCols) {
        cols2++;
        slots = findSlots(cols2);
      }
    }

    // Center the last row if it has fewer tables
    if (slots.length > 0) {
      const lastY = slots[slots.length - 1].y;
      const lastRowStart = slots.findIndex((s) => s.y === lastY);
      const lastRowCount = slots.length - lastRowStart;
      if (lastRowCount < cols2 && lastRowCount > 0) {
        const lastRowW = (lastRowCount - 1) * spacing;
        const centeredStartX = (floorW - lastRowW) / 2;
        for (let i = lastRowStart; i < slots.length; i++) {
          slots[i].x = centeredStartX + (i - lastRowStart) * spacing;
        }
      }
    }

    slots.forEach((s) => {
      s.x = Math.max(margin, Math.min(floorW - margin, s.x));
      s.y = Math.max(margin, Math.min(floorH - margin, s.y));
    });

    return tables.map((table, i) => {
      if (i < slots.length) {
        return { ...table, x: slots[i].x, y: slots[i].y };
      } else {
        // Overflow: add extra rows beyond current floor
        const overflowIdx = i - slots.length;
        const overflowCol = overflowIdx % cols2;
        const overflowRow = Math.floor(overflowIdx / cols2);
        const rowW = (Math.min(cols2, tableCount - slots.length - overflowRow * cols2) - 1) * spacing;
        const ox = Math.max(margin, Math.min(floorW - margin, (floorW - rowW) / 2 + overflowCol * spacing));
        const oy = Math.min(floorH - margin, (slots.length > 0 ? slots[slots.length - 1].y : margin) + (overflowRow + 1) * rowH);
        return { ...table, x: ox, y: oy };
      }
    });
  }, [state.objects, state.floorSize.width, state.floorSize.height]);

  const getMaxSlotCount = useCallback((tableCount: number): number => {
    // Use the same slot-finding logic as computeArrangedTables to count available positions
    const spacing = 200;
    const objectSpacing = 30;
    const tableBody = 50;
    const margin = 50;
    const floorW = state.floorSize.width;
    const floorH = state.floorSize.height;
    const rowH = spacing;
    const maxFitCols = Math.max(1, Math.floor((floorW - 2 * margin) / spacing) + 1);

    const objectBounds = state.objects.map((obj) => {
      const pad = obj.padding || { top: 0, right: 0, bottom: 0, left: 0 };
      return {
        left: obj.x - Math.max(pad.left, objectSpacing),
        top: obj.y - Math.max(pad.top, objectSpacing),
        right: obj.x + obj.width + Math.max(pad.right, objectSpacing),
        bottom: obj.y + obj.height + Math.max(pad.bottom, objectSpacing),
      };
    });

    const overlapsObject = (x: number, y: number) =>
      objectBounds.some(
        (b) => x + tableBody > b.left && x - tableBody < b.right && y + tableBody > b.top && y - tableBody < b.bottom
      );

    // Try with the column count the arrange algorithm would use
    const idealCols = Math.ceil(Math.sqrt(tableCount));
    let cols = Math.min(idealCols, maxFitCols);

    // Count slots for increasing column counts (matching the retry logic in computeArrangedTables)
    let bestSlotCount = 0;
    for (let c = cols; c <= maxFitCols; c++) {
      let slotCount = 0;
      let y = margin;
      let lastPlacedY = -Infinity;
      const scanStep = rowH / 2;

      while (y <= floorH - margin) {
        if (y - lastPlacedY < rowH - 1) { y += scanStep; continue; }
        const rowW = (c - 1) * spacing;
        const startX = (floorW - rowW) / 2;
        let rowSlots = 0;
        for (let col = 0; col < c; col++) {
          const x = startX + col * spacing;
          if (x < margin || x > floorW - margin) continue;
          if (!overlapsObject(x, y)) rowSlots++;
        }
        if (rowSlots > 0) {
          slotCount += rowSlots;
          lastPlacedY = y;
          y += rowH;
        } else {
          y += scanStep;
        }
      }
      bestSlotCount = Math.max(bestSlotCount, slotCount);
      if (slotCount >= tableCount) break;
    }
    return bestSlotCount;
  }, [state.objects, state.floorSize.width, state.floorSize.height]);

  const getRemainingCapacity = useCallback((): number => {
    const maxSlots = getMaxSlotCount(state.tables.length + 1);
    return Math.max(0, maxSlots - state.tables.length);
  }, [state.tables.length, getMaxSlotCount]);

  const arrangeTables = useCallback((options: {
    layout: 'grid' | 'staggered'; spacing: number; objectSpacing: number; maxCols: number;
  }) => {
    const arranged = computeArrangedTables(state.tables, options);
    if (arranged.length > 0) {
      setTables(arranged);
      setPendingAutoAction('Arrange tables applied');
    }
  }, [state.tables, computeArrangedTables, setTables]);

  const zoomFit = useCallback(() => {
    if (!floorViewRef.current) return;
    const container = floorViewRef.current;
    // Account for padding (p-4 = 16px each side)
    const availW = container.clientWidth - 32;
    const availH = container.clientHeight - 32;
    const scaleX = availW / state.floorSize.width;
    const scaleY = availH / state.floorSize.height;
    setZoom(Math.max(0.3, Math.round(Math.min(scaleX, scaleY, 2) * 100) / 100));
  }, [state.floorSize, setZoom]);

  const autoSeatByGroup = useCallback(() => {
    const unassigned = state.guests.filter((g) => !g.tableId);
    if (unassigned.length === 0 || state.tables.length === 0) return;

    const groups: Record<string, SeatingGuest[]> = {};
    unassigned.forEach((g) => {
      const key = g.group || `__solo_${g.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    const sortedGroups = Object.values(groups).sort((a, b) => b.length - a.length);
    const tableAvail = state.tables.map((t) => {
      const taken = new Set(state.guests.filter((g) => g.tableId === t.id && g.seatIndex !== null).map((g) => g.seatIndex!));
      const available: number[] = [];
      for (let i = 0; i < t.seats.length; i++) { if (!taken.has(i)) available.push(i); }
      return { tableId: t.id, available };
    });

    for (const groupGuests of sortedGroups) {
      let bestTable = tableAvail.filter((t) => t.available.length >= groupGuests.length).sort((a, b) => a.available.length - b.available.length)[0];
      if (!bestTable) {
        let remaining = [...groupGuests];
        for (const ta of tableAvail) {
          if (remaining.length === 0) break;
          while (ta.available.length > 0 && remaining.length > 0) {
            assignGuest(remaining.shift()!.id, ta.tableId, ta.available.shift()!);
          }
        }
        continue;
      }
      for (const guest of groupGuests) {
        assignGuest(guest.id, bestTable.tableId, bestTable.available.shift()!);
      }
    }
    setPendingAutoAction('Auto-seat applied');
  }, [state.guests, state.tables, assignGuest]);

  const handleSeatClick = (tableId: string, seatIndex: number, guestId: string | null) => {
    if (selectedGuestId && !guestId) {
      assignGuest(selectedGuestId, tableId, seatIndex);
      setSelectedGuestId(null);
      setSelectedSeatInfo(null);
      return;
    }
    if (guestId) { setSelectedGuestId(guestId); setSelectedSeatInfo(null); return; }
    if (selectedSeatInfo?.tableId === tableId && selectedSeatInfo?.seatIndex === seatIndex) {
      setSelectedSeatInfo(null);
    } else {
      setSelectedSeatInfo({ tableId, seatIndex });
      setSelectedGuestId(null);
    }
  };

  const handleGuestSelect = (guestId: string | null) => {
    if (guestId && selectedSeatInfo) {
      assignGuest(guestId, selectedSeatInfo.tableId, selectedSeatInfo.seatIndex);
      setSelectedSeatInfo(null);
      setSelectedGuestId(null);
    } else {
      setSelectedGuestId(guestId);
      if (guestId) setSelectedSeatInfo(null);
    }
  };

  const handleTableClick = (tableId: string, e?: React.MouseEvent | MouseEvent) => {
    if (e && e.shiftKey) {
      setSelectedTableIds((prev) => { const next = new Set(prev); if (next.has(tableId)) next.delete(tableId); else next.add(tableId); return next; });
      return;
    }
    setSelectedTableIds(new Set());
    setSelectedObjectIds(new Set());
    const table = getTableById(tableId);
    if (table) { setEditingTable(table); setTableModalOpen(true); }
  };

  const handleObjectClick = (objectId: string, e?: React.MouseEvent | MouseEvent) => {
    if (e && e.shiftKey) {
      setSelectedObjectIds((prev) => { const next = new Set(prev); if (next.has(objectId)) next.delete(objectId); else next.add(objectId); return next; });
      return;
    }
    setSelectedTableIds(new Set());
    setSelectedObjectIds(new Set());
    const object = state.objects.find((o) => o.id === objectId);
    if (object) { setEditingObject(object); setObjectModalOpen(true); }
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedTableIds.size === 0 && selectedObjectIds.size === 0) return;
    if (!confirm(`Delete ${selectedTableIds.size + selectedObjectIds.size} selected item(s)?`)) return;
    selectedTableIds.forEach((id) => deleteTable(id));
    selectedObjectIds.forEach((id) => deleteObject(id));
    setSelectedTableIds(new Set());
    setSelectedObjectIds(new Set());
  }, [selectedTableIds, selectedObjectIds, deleteTable, deleteObject]);

  const handleGuestSave = (data: { id: string; meal: string; dietary: string[]; notes: string }) => {
    updateGuest(data.id, { meal: data.meal, dietary: data.dietary, notes: data.notes });
    setEditingGuest(null);
  };

  const handleTableSave = (data: { name: string; seatCount: number; id?: string; preselectedGuestIds?: string[]; tableCount?: number }) => {
    if (data.id) {
      const table = getTableById(data.id);
      if (table) {
        let newSeats = [...table.seats];
        if (data.seatCount > table.seats.length) {
          for (let i = table.seats.length; i < data.seatCount; i++) newSeats.push({ guestId: null });
        } else if (data.seatCount < table.seats.length) {
          state.guests.forEach((guest) => {
            if (guest.tableId === data.id && guest.seatIndex !== null && guest.seatIndex >= data.seatCount) unassignGuest(guest.id);
          });
          newSeats = newSeats.slice(0, data.seatCount);
        }
        updateTable(data.id, { name: data.name, seats: newSeats });
      }
    } else if (data.tableCount && data.tableCount > 1) {
      const remaining = getRemainingCapacity();
      const actualCount = Math.min(data.tableCount, remaining);
      if (actualCount <= 0) {
        setCapacityWarning(`Floor is at capacity (${state.tables.length} tables). Increase floor size or remove objects to add more.`);
        setTimeout(() => setCapacityWarning(null), 5000);
        setEditingTable(null);
        return;
      }
      if (actualCount < data.tableCount) {
        setCapacityWarning(`Only ${actualCount} of ${data.tableCount} tables could fit. Increase floor size for more.`);
        setTimeout(() => setCapacityWarning(null), 5000);
      }
      // Find the highest existing number for this prefix
      const prefix = data.name || 'Table';
      let maxNum = 0;
      state.tables.forEach((t) => {
        const match = t.name.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`));
        if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
      });
      const startNum = maxNum + 1;
      const newTables: Table[] = Array.from({ length: actualCount }, (_, i) => ({
        id: `table-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${prefix} ${startNum + i}`,
        x: 100, y: 100,
        shape: 'round' as const,
        seats: Array(data.seatCount).fill(null).map(() => ({ guestId: null })),
        width: 100, height: 100, rotation: 0,
      }));
      const allTables = [...state.tables, ...newTables];
      const arranged = computeArrangedTables(allTables, { layout: 'grid', spacing: 200, objectSpacing: 30, maxCols: 0 });
      setTables(arranged);
      setPendingAutoAction(`Added and arranged ${actualCount} tables`);
    } else {
      const remaining = getRemainingCapacity();
      if (remaining <= 0) {
        setCapacityWarning(`Floor is at capacity (${state.tables.length} tables). Increase floor size or remove objects to add more.`);
        setTimeout(() => setCapacityWarning(null), 5000);
        setEditingTable(null);
        return;
      }
      let tableName = data.name;
      if (!tableName) {
        let maxNum = 0;
        state.tables.forEach((t) => {
          const match = t.name.match(/^Table\s*(\d+)$/);
          if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
        });
        tableName = `Table ${maxNum + 1}`;
      }
      const newTable: Table = {
        id: `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: tableName,
        x: 100, y: 100,
        shape: 'round',
        seats: Array(data.seatCount).fill(null).map(() => ({ guestId: null })),
        width: 100, height: 100, rotation: 0,
      };
      const allTables = [...state.tables, newTable];
      const arranged = computeArrangedTables(allTables, { layout: 'grid', spacing: 200, objectSpacing: 30, maxCols: 0 });
      setTables(arranged);
      if (data.preselectedGuestIds) {
        const placedTable = arranged.find((t) => t.id === newTable.id);
        if (placedTable) {
          data.preselectedGuestIds.forEach((guestId, i) => { if (i < data.seatCount) assignGuest(guestId, placedTable.id, i); });
        }
      }
    }
    setEditingTable(null);
  };

  const handleObjectSave = (data: Omit<VenueObject, 'id' | 'x' | 'y'> & { id?: string }) => {
    if (data.id) updateObject(data.id, data);
    else addObject({ ...data, x: 100, y: 100 });
    setEditingObject(null);
  };

  const handleAddObject = (type: string) => {
    const config = VENUE_OBJECT_TYPES.find((t) => t.type === type);
    if (config) {
      addObject({
        type, label: config.label,
        x: 100 + state.objects.length * 20, y: 100 + state.objects.length * 20,
        width: config.defaultWidth, height: config.defaultHeight, rotation: 0,
      });
    }
    setShowObjectMenu(false);
  };

  const unassignedCount = state.guests.filter((g) => !g.tableId).length;
  const assignedCount = state.guests.length - unassignedCount;

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* Main content */}
      <div className={`flex-1 flex min-h-0 ${isFullscreen ? 'fixed inset-0 z-40 bg-gray-50' : ''}`} ref={floorContainerRef}>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">
                  {state.guests.length} guests | {assignedCount} seated | {unassignedCount} unassigned | {state.tables.length} tables
                </p>
                <div className="w-px h-4 bg-gray-300" />
                <button onClick={() => {
                  const remaining = getRemainingCapacity();
                  if (remaining <= 0) {
                    setCapacityWarning(`Floor is at capacity (${state.tables.length} tables). Increase floor size or remove objects to add more.`);
                    setTimeout(() => setCapacityWarning(null), 5000);
                  } else {
                    setEditingTable(null); setTableModalOpen(true);
                  }
                }}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Add Table</button>
                <div className="relative">
                  <button onClick={() => setShowObjectMenu(!showObjectMenu)}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ Add Object</button>
                  {showObjectMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowObjectMenu(false)} />
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        {VENUE_OBJECT_TYPES.map((obj) => (
                          <button key={obj.type} onClick={() => handleAddObject(obj.type)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg">
                            <span className="text-xl">{OBJECT_ICONS[obj.type]}</span>
                            <span className="text-sm text-gray-700">{obj.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saving && <span className="text-sm text-gray-500">Saving...</span>}
                <div className="flex items-center gap-1">
                  <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30" title="Undo (Ctrl+Z)">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" /></svg>
                  </button>
                  <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30" title="Redo (Ctrl+Y)">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" /></svg>
                  </button>
                </div>
                <button onClick={() => window.print()} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Print</button>
              </div>
            </div>
          </div>
          <FloorControls
            floorWidth={state.floorSize.width} floorHeight={state.floorSize.height}
            zoom={state.zoom} isFullscreen={isFullscreen}
            onFloorSizeChange={setFloorSize} onArrangeTables={arrangeTables}
            onAutoSeat={autoSeatByGroup} snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
            showCenterLines={showCenterLines} onToggleCenterLines={() => setShowCenterLines(!showCenterLines)}
            onZoomChange={setZoom}
            onZoomFit={zoomFit} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
          {capacityWarning && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-red-700 font-medium">{capacityWarning}</span>
              <button onClick={() => setCapacityWarning(null)}
                className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-100 text-xs font-medium">Dismiss</button>
            </div>
          )}
          {pendingAutoAction && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-amber-800 font-medium">{pendingAutoAction}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { undo(); setPendingAutoAction(null); }}
                  className="px-3 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-100 text-xs font-medium">Undo</button>
                <button onClick={() => setPendingAutoAction(null)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium">Accept</button>
              </div>
            </div>
          )}
          {(selectedTableIds.size > 0 || selectedObjectIds.size > 0) && (
            <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center gap-3 text-sm">
              <span className="text-indigo-700 font-medium">{selectedTableIds.size + selectedObjectIds.size} selected</span>
              <button onClick={handleDeleteSelected} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium">Delete Selected</button>
              <button onClick={() => { setSelectedTableIds(new Set()); setSelectedObjectIds(new Set()); }} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium text-gray-600">Clear</button>
            </div>
          )}
          <div ref={floorViewRef} className="flex-1 min-h-0 p-4 overflow-hidden">
            <FloorPlan
              tables={state.tables} guests={state.guests} objects={state.objects}
              floorSize={state.floorSize} zoom={state.zoom}
              selectedGuestId={selectedGuestId} selectedSeatInfo={selectedSeatInfo}
              onTableDrag={(id, x, y) => {
                const gs = 20;
                const margin = 50;
                const cx = Math.max(margin, Math.min(state.floorSize.width - margin, snapToGrid ? Math.round(x / gs) * gs : x));
                const cy = Math.max(margin, Math.min(state.floorSize.height - margin, snapToGrid ? Math.round(y / gs) * gs : y));
                updateTable(id, { x: cx, y: cy });
              }}
              onObjectDrag={(id, x, y) => {
                const gs = 20;
                const obj = state.objects.find((o) => o.id === id);
                const w = obj?.width || 100;
                const h = obj?.height || 100;
                const cx = Math.max(0, Math.min(state.floorSize.width - w, snapToGrid ? Math.round(x / gs) * gs : x));
                const cy = Math.max(0, Math.min(state.floorSize.height - h, snapToGrid ? Math.round(y / gs) * gs : y));
                updateObject(id, { x: cx, y: cy });
              }}
              onSeatClick={handleSeatClick} onTableClick={handleTableClick}
              onObjectClick={handleObjectClick} onZoomChange={setZoom}
              onObjectResize={(id, w, h) => {
                const obj = state.objects.find((o) => o.id === id);
                const maxW = obj ? state.floorSize.width - obj.x : w;
                const maxH = obj ? state.floorSize.height - obj.y : h;
                updateObject(id, { width: Math.min(w, maxW), height: Math.min(h, maxH) });
              }}
              snapToGrid={snapToGrid} gridSize={20} showCenterLines={showCenterLines}
              selectedTableIds={selectedTableIds} selectedObjectIds={selectedObjectIds}
              onGuestDrop={(guestId, tableId, seatIndex) => {
                assignGuest(guestId, tableId, seatIndex);
                setSelectedGuestId(null);
                setSelectedSeatInfo(null);
              }}
            />
          </div>
        </div>
        <GuestSidebar
          guests={state.guests} tables={state.tables}
          selectedGuestId={selectedGuestId} selectedSeatInfo={selectedSeatInfo}
          onGuestSelect={handleGuestSelect}
          onGuestEdit={(guest) => { setEditingGuest(guest); setGuestModalOpen(true); }}
          onUnassign={unassignGuest}
        />
      </div>

      {/* Modals */}
      <GuestModal guest={editingGuest} isOpen={guestModalOpen}
        onClose={() => { setGuestModalOpen(false); setEditingGuest(null); }}
        onSave={handleGuestSave}
      />
      <SeatingTableModal table={editingTable} isOpen={tableModalOpen}
        onClose={() => { setTableModalOpen(false); setEditingTable(null); }}
        onSave={handleTableSave}
        onDelete={editingTable ? () => deleteTable(editingTable.id) : undefined}
        onDuplicate={editingTable ? () => { addTable(editingTable.seats.length, `${editingTable.name} (copy)`); setEditingTable(null); } : undefined}
        unassignedGuests={state.guests.filter((g) => !g.tableId)}
      />
      <ObjectModal object={editingObject} isOpen={objectModalOpen}
        onClose={() => { setObjectModalOpen(false); setEditingObject(null); }}
        onSave={handleObjectSave}
        onDelete={editingObject ? () => deleteObject(editingObject.id) : undefined}
      />
    </div>
  );
}
