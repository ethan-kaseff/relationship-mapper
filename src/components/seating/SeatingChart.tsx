'use client';

import { useState, useCallback, useRef } from 'react';
import { SeatingGuest, Table, VenueObject, SeatingLayout } from '@/types/seating';
import { PIXELS_PER_FOOT, DEFAULT_TABLE_WIDTH } from '@/lib/seating-constants';
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

function numberTablesForLayout(tables: Table[], mode: 'ltr' | 'snake'): Table[] {
  if (tables.length === 0) return tables;
  const ROW_THRESHOLD = 90;
  const sorted = [...tables].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Table[][] = [];
  for (const table of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(table.y - lastRow[0].y) <= ROW_THRESHOLD) {
      lastRow.push(table);
    } else {
      rows.push([table]);
    }
  }
  const numbered: Table[] = [];
  let n = 1;
  rows.forEach((row, i) => {
    const orderedRow = mode === 'snake' && i % 2 === 1
      ? [...row].sort((a, b) => b.x - a.x)
      : [...row].sort((a, b) => a.x - b.x);
    for (const table of orderedRow) {
      numbered.push({ ...table, name: `Table ${String(n).padStart(2, '0')}` });
      n++;
    }
  });
  return numbered;
}

// Rename any fully-filled single-group tables to the group name.
// If the same group fills multiple tables, suffix them 1, 2, 3…
function renameTablesByGroup(tables: Table[], guests: SeatingGuest[]): Table[] | null {
  const tablesToRename = new Map<string, string>(); // tableId -> groupName

  for (const table of tables) {
    const seated = guests.filter((g) => g.tableId === table.id);
    if (seated.length === 0 || table.seats.length === 0 || seated.length < table.seats.length) continue;
    // Every guest must share the same non-empty group — no filtering out blanks
    const firstGroup = seated[0].group;
    if (!firstGroup || !seated.every((g) => g.group === firstGroup)) continue;
    tablesToRename.set(table.id, firstGroup);
  }

  if (tablesToRename.size === 0) return null;

  const byGroup = new Map<string, string[]>();
  for (const [tableId, groupName] of tablesToRename) {
    if (!byGroup.has(groupName)) byGroup.set(groupName, []);
    byGroup.get(groupName)!.push(tableId);
  }

  const renames = new Map<string, string>();
  for (const [groupName, tableIds] of byGroup) {
    if (tableIds.length === 1) {
      renames.set(tableIds[0], groupName);
    } else {
      const sorted = [...tableIds].sort((a, b) => {
        const ta = tables.find((t) => t.id === a);
        const tb = tables.find((t) => t.id === b);
        if (!ta || !tb) return 0;
        return ta.y - tb.y || ta.x - tb.x;
      });
      sorted.forEach((id, i) => renames.set(id, `${groupName} ${i + 1}`));
    }
  }

  return tables.map((t) => {
    const newName = renames.get(t.id);
    if (newName === undefined) return t;
    return { ...t, name: newName };
  });
}

export interface GuestDetailUpdates {
  group: string;
  meal: string;
  dietary: string[];
  notes: string;
  ticketType: string;
  seatingRequest: string;
  tableRequest: string;
}

interface SeatingChartProps {
  layout: SeatingLayout | null;
  guests: SeatingGuest[];
  onSave: (state: SeatingState) => Promise<void>;
  // Persists a guest's editable details (from the popup) to the invite record.
  onGuestSave?: (inviteId: string, updates: GuestDetailUpdates) => void | Promise<void>;
}

export default function SeatingChart({ layout, guests, onSave, onGuestSave }: SeatingChartProps) {
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
  const [groupSeatingPending, setGroupSeatingPending] = useState<{
    primaryGuestId: string;
    targetTableId: string;
    targetSeatIndex: number;
    groupMembers: SeatingGuest[];
    tableRequestMembers: SeatingGuest[];
    availableSeats: number[];
  } | null>(null);
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
    assignGuest, unassignGuest, clearAllSeating, addObject, updateObject, deleteObject,
    setZoom, setFloorSize, getTableById, undo, redo, canUndo, canRedo, batchDispatch,
  } = useSeatingChart(layout, guests, handleSave);

  const computeArrangedTables = useCallback((tables: Table[], options: {
    layout: 'grid' | 'staggered'; spacing: number; objectSpacing: number; maxCols: number;
  }): Table[] => {
    if (tables.length === 0) return tables;
    const { layout: layoutType, spacing, objectSpacing } = options;
    const seatOffset = 20;
    const seatSize = 28;
    const tableBody = Math.max(...tables.map((t) => {
      const w = t.width || DEFAULT_TABLE_WIDTH;
      const h = t.height || DEFAULT_TABLE_WIDTH;
      return Math.max(w, h) / 2 + seatOffset + seatSize / 2;
    }));
    const tableCount = tables.length;
    const margin = tableBody;
    const floorW = state.floorSize.width;
    const floorH = state.floorSize.height;

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
    const usableW = floorW - 2 * margin;
    const maxFitCols = Math.max(1, Math.floor(usableW / spacing) + 1);

    // Determine how many columns we need for this table count
    const idealCols = Math.ceil(Math.sqrt(tableCount));
    let cols = options.maxCols > 0 ? options.maxCols : Math.min(idealCols, maxFitCols);

    // Build centered slots row by row, skipping positions that overlap objects
    const buildSlots = (numCols: number): { x: number; y: number }[] => {
      const slots: { x: number; y: number }[] = [];
      let gy = margin;
      let rowNum = 0;
      while (slots.length < tableCount && gy <= floorH - margin) {
        const rowSlots: { x: number; y: number }[] = [];
        const isStaggeredRow = layoutType === 'staggered' && rowNum % 2 === 1;
        const rowCols = isStaggeredRow ? numCols - 1 : numCols;
        if (rowCols <= 0) { gy += rowH; rowNum++; continue; }
        const needed = Math.min(rowCols, tableCount - slots.length);
        const rowW = (needed - 1) * spacing;
        const rowStartX = (floorW - rowW) / 2;

        for (let col = 0; col < needed; col++) {
          const gx = rowStartX + col * spacing;
          if (gx >= margin && gx <= floorW - margin && !overlapsObject(gx, gy)) {
            rowSlots.push({ x: gx, y: gy });
          }
        }
        if (rowSlots.length > 0) slots.push(...rowSlots);
        gy += rowH;
        rowNum++;
      }
      return slots;
    };

    let slots = buildSlots(cols);
    // If not enough slots, try more columns
    while (slots.length < tableCount && cols < maxFitCols) {
      cols++;
      slots = buildSlots(cols);
    }

    // Snap each table to its nearest available slot, preserving relative positions.
    // Each table claims the closest unclaimed slot, so manual swaps are preserved.
    const availableSlots = new Set(slots.map((_, i) => i));
    const resultPositions: Map<string, { x: number; y: number }> = new Map();

    // Build a list of (table, distances to each slot) sorted by minimum distance
    // so the table closest to any slot gets first pick
    const assignments: { tableId: string; slotIdx: number; dist: number }[] = [];
    for (const table of tables) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < slots.length; i++) {
        const dx = table.x - slots[i].x;
        const dy = table.y - slots[i].y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      assignments.push({ tableId: table.id, slotIdx: bestIdx, dist: bestDist });
    }

    // Greedily assign: process tables by shortest distance first
    assignments.sort((a, b) => a.dist - b.dist);
    for (const assign of assignments) {
      // Find the closest *available* slot for this table
      let bestIdx = -1;
      let bestDist = Infinity;
      const table = tables.find((t) => t.id === assign.tableId)!;
      for (const idx of availableSlots) {
        const dx = table.x - slots[idx].x;
        const dy = table.y - slots[idx].y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      }
      if (bestIdx >= 0) {
        resultPositions.set(assign.tableId, slots[bestIdx]);
        availableSlots.delete(bestIdx);
      } else {
        // No slots left, clamp to floor bounds
        const cx = Math.max(margin, Math.min(floorW - margin, table.x));
        const cy = Math.max(margin, Math.min(floorH - margin, table.y));
        resultPositions.set(assign.tableId, { x: cx, y: cy });
      }
    }

    return tables.map((table) => {
      const pos = resultPositions.get(table.id)!;
      return { ...table, x: pos.x, y: pos.y };
    });
  }, [state.objects, state.floorSize.width, state.floorSize.height]);

  const getMaxSlotCount = useCallback((tableCount: number, tableWidth?: number, tableHeight?: number): number => {
    // Use the same slot-finding logic as computeArrangedTables to count available positions
    const objectSpacing = 30;
    const seatOffset = 20;
    const seatSz = 28;
    // Use provided dimensions (for new tables) or largest existing table
    const maxDim = Math.max(
      tableWidth || DEFAULT_TABLE_WIDTH,
      tableHeight || DEFAULT_TABLE_WIDTH,
      ...state.tables.map((t) => Math.max(t.width || DEFAULT_TABLE_WIDTH, t.height || DEFAULT_TABLE_WIDTH))
    );
    const tableBody = maxDim / 2 + seatOffset + seatSz / 2;
    // Spacing = 2 * tableBody + small gap (enough for tables not to overlap)
    const spacing = tableBody * 2 + 5;
    const margin = tableBody;
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

    // Try all column counts to find the maximum number of slots
    let bestSlotCount = 0;
    for (let c = 1; c <= maxFitCols; c++) {
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
    }
    return bestSlotCount;
  }, [state.tables, state.objects, state.floorSize.width, state.floorSize.height]);

  const getRemainingCapacity = useCallback((tableWidth?: number, tableHeight?: number): number => {
    const maxSlots = getMaxSlotCount(state.tables.length + 1, tableWidth, tableHeight);
    const remaining = Math.max(0, maxSlots - state.tables.length);
    return remaining;
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

    // Re-bucket guests whose tableRequest matches an existing unassigned group
    const namedGroupKeys = new Set(Object.keys(groups).filter((k) => !k.startsWith('__solo_')));
    unassigned.forEach((g) => {
      if (g.tableRequest && namedGroupKeys.has(g.tableRequest)) {
        const currentKey = g.group || `__solo_${g.id}`;
        if (currentKey !== g.tableRequest) {
          groups[currentKey] = groups[currentKey].filter((m) => m.id !== g.id);
          if (groups[currentKey].length === 0) delete groups[currentKey];
          if (!groups[g.tableRequest]) groups[g.tableRequest] = [];
          groups[g.tableRequest].push(g);
        }
      }
    });

    const sortedGroups = Object.values(groups).sort((a, b) => b.length - a.length);
    // Sort by visual position (top-to-bottom, left-to-right) so auto-seat fills
    // tables in the same order their numbers appear on the floor plan
    const tableAvail = [...state.tables]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((t) => {
        const taken = new Set(state.guests.filter((g) => g.tableId === t.id && g.seatIndex !== null).map((g) => g.seatIndex!));
        const available: number[] = [];
        for (let i = 0; i < t.seats.length; i++) { if (!taken.has(i)) available.push(i); }
        return { tableId: t.id, available };
      });

    // Collect all assignments before dispatching so we can project the final state
    const pendingAssignments: { guestId: string; tableId: string; seatIndex: number }[] = [];

    for (const groupGuests of sortedGroups) {
      let bestTable = tableAvail.find((t) => t.available.length >= groupGuests.length);
      if (!bestTable) {
        let remaining = [...groupGuests];
        for (const ta of tableAvail) {
          if (remaining.length === 0) break;
          while (ta.available.length > 0 && remaining.length > 0) {
            pendingAssignments.push({ guestId: remaining.shift()!.id, tableId: ta.tableId, seatIndex: ta.available.shift()! });
          }
        }
        continue;
      }
      for (const guest of groupGuests) {
        pendingAssignments.push({ guestId: guest.id, tableId: bestTable.tableId, seatIndex: bestTable.available.shift()! });
      }
    }

    // Project final guest state and rename fully-filled single-group tables
    const assignmentMap = new Map(pendingAssignments.map((a) => [a.guestId, a]));
    const projectedGuests = state.guests.map((g) => {
      const a = assignmentMap.get(g.id);
      return a ? { ...g, tableId: a.tableId, seatIndex: a.seatIndex } : g;
    });
    const renamedTables = renameTablesByGroup(state.tables, projectedGuests);

    const actions: Parameters<typeof batchDispatch>[0] = pendingAssignments.map(({ guestId, tableId, seatIndex }) => ({
      type: 'ASSIGN_GUEST' as const, payload: { guestId, tableId, seatIndex },
    }));
    if (renamedTables) actions.push({ type: 'SET_TABLES', payload: renamedTables });
    batchDispatch(actions);

    setPendingAutoAction('Auto-seat applied');
  }, [state.guests, state.tables, batchDispatch]);

  const triggerGroupSeating = (primaryGuestId: string, targetTableId: string, targetSeatIndex: number) => {
    const primary = state.guests.find((g) => g.id === primaryGuestId);
    if (!primary) return;

    // Intra-table move: skip group modal
    if (primary.tableId === targetTableId) {
      if (primary.seatIndex !== null) unassignGuest(primaryGuestId);
      assignGuest(primaryGuestId, targetTableId, targetSeatIndex);
      setSelectedGuestId(null);
      setSelectedSeatInfo(null);
      return;
    }

    const group = primary.group;
    const groupMembers = group
      ? state.guests.filter((g) => g.group === group && g.id !== primaryGuestId && g.tableId !== targetTableId)
      : [];
    const groupMemberIds = new Set(groupMembers.map((g) => g.id));
    const tableRequestMembers = group
      ? state.guests.filter((g) => g.tableRequest === group && g.id !== primaryGuestId && g.tableId !== targetTableId && !groupMemberIds.has(g.id))
      : [];

    if (groupMembers.length === 0 && tableRequestMembers.length === 0) {
      const targetTable = state.tables.find((t) => t.id === targetTableId);
      if (!confirm(`Move ${primary.name} to ${targetTable?.name ?? 'this table'}, seat ${targetSeatIndex + 1}?`)) return;
      if (primary.tableId) unassignGuest(primaryGuestId);
      assignGuest(primaryGuestId, targetTableId, targetSeatIndex);
      setSelectedGuestId(null);
      setSelectedSeatInfo(null);
      return;
    }

    const takenSeats = new Set(
      state.guests.filter((g) => g.tableId === targetTableId && g.seatIndex !== null).map((g) => g.seatIndex!)
    );
    takenSeats.add(targetSeatIndex);
    const targetTable = state.tables.find((t) => t.id === targetTableId);
    const availableSeats = targetTable
      ? targetTable.seats.map((_, i) => i).filter((i) => !takenSeats.has(i))
      : [];

    setGroupSeatingPending({ primaryGuestId, targetTableId, targetSeatIndex, groupMembers, tableRequestMembers, availableSeats });
  };

  const handleGroupSeatingConfirm = (includeGroup: boolean) => {
    if (!groupSeatingPending) return;
    const { primaryGuestId, targetTableId, targetSeatIndex, groupMembers, tableRequestMembers, availableSeats } = groupSeatingPending;
    const primary = state.guests.find((g) => g.id === primaryGuestId);

    // Collect assignments so we can project the final guest state for table renaming
    const pendingAssignments: { guestId: string; tableId: string; seatIndex: number }[] = [
      { guestId: primaryGuestId, tableId: targetTableId, seatIndex: targetSeatIndex },
    ];

    if (includeGroup) {
      const seen = new Set(groupMembers.map((g) => g.id));
      const allAdditional = [...groupMembers, ...tableRequestMembers.filter((g) => !seen.has(g.id))];
      const unassigned = allAdditional.filter((g) => !g.tableId);
      const atOtherTable = allAdditional.filter((g) => g.tableId);
      [...unassigned, ...atOtherTable].slice(0, availableSeats.length).forEach((g, i) => {
        pendingAssignments.push({ guestId: g.id, tableId: targetTableId, seatIndex: availableSeats[i] });
      });
    }

    // Project final guest state and rename fully-filled single-group tables
    const assignmentMap = new Map(pendingAssignments.map((a) => [a.guestId, a]));
    const projectedGuests = state.guests.map((g) => {
      const a = assignmentMap.get(g.id);
      return a ? { ...g, tableId: a.tableId, seatIndex: a.seatIndex } : g;
    });
    const renamedTables = renameTablesByGroup(state.tables, projectedGuests);

    const actions: Parameters<typeof batchDispatch>[0] = [];
    if (primary?.tableId) actions.push({ type: 'UNASSIGN_GUEST', payload: primaryGuestId });
    actions.push({ type: 'ASSIGN_GUEST', payload: { guestId: primaryGuestId, tableId: targetTableId, seatIndex: targetSeatIndex } });
    pendingAssignments.filter((a) => a.guestId !== primaryGuestId).forEach(({ guestId, tableId, seatIndex }) => {
      const g = state.guests.find((guest) => guest.id === guestId);
      if (g?.tableId) actions.push({ type: 'UNASSIGN_GUEST', payload: guestId });
      actions.push({ type: 'ASSIGN_GUEST', payload: { guestId, tableId, seatIndex } });
    });
    if (renamedTables) actions.push({ type: 'SET_TABLES', payload: renamedTables });
    batchDispatch(actions);

    setGroupSeatingPending(null);
    setSelectedGuestId(null);
    setSelectedSeatInfo(null);
  };

  const handleSeatClick = (tableId: string, seatIndex: number, guestId: string | null) => {
    // Clicking a seated person always opens their details. Moving and swapping
    // are done by dragging the person to another seat (see onGuestDrop).
    if (guestId) {
      const guest = state.guests.find((g) => g.id === guestId);
      if (guest) {
        setEditingGuest(guest);
        setGuestModalOpen(true);
      }
      setSelectedGuestId(null);
      setSelectedSeatInfo(null);
      return;
    }
    // Empty seat: drop in a guest picked from the sidebar, otherwise select it.
    if (selectedGuestId) {
      triggerGroupSeating(selectedGuestId, tableId, seatIndex);
      return;
    }
    if (selectedSeatInfo?.tableId === tableId && selectedSeatInfo?.seatIndex === seatIndex) {
      setSelectedSeatInfo(null);
    } else {
      setSelectedSeatInfo({ tableId, seatIndex });
      setSelectedGuestId(null);
    }
  };

  const handleGuestSelect = (guestId: string | null) => {
    if (guestId && selectedSeatInfo) {
      triggerGroupSeating(guestId, selectedSeatInfo.tableId, selectedSeatInfo.seatIndex);
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

  const handleGuestSave = (data: { id: string; group: string; meal: string; dietary: string[]; notes: string; tableId: string | null; ticketType: string; seatingRequest: string; tableRequest: string }) => {
    updateGuest(data.id, { group: data.group, meal: data.meal, dietary: data.dietary, notes: data.notes, ticketType: data.ticketType });
    // Persist these details to the invite record — the local update above doesn't
    // cover table/seating requests, and the seating save only writes seat positions.
    onGuestSave?.(data.id, {
      group: data.group,
      meal: data.meal,
      dietary: data.dietary,
      notes: data.notes,
      ticketType: data.ticketType,
      seatingRequest: data.seatingRequest,
      tableRequest: data.tableRequest,
    });
    const guest = state.guests.find((g) => g.id === data.id);
    if (guest && guest.tableId !== data.tableId) {
      if (data.tableId) {
        // Moving to a different table. If the person has group (or table-request)
        // members seated elsewhere, route through the group-aware mover so it
        // offers to bring them along — the same prompt as dragging. Solo guests
        // just move into an open seat.
        const table = state.tables.find((t) => t.id === data.tableId);
        const openSeat = table ? table.seats.findIndex((s) => !s.guestId) : -1;
        if (openSeat >= 0) {
          const grp = guest.group;
          const hasGroupToMove = !!grp && state.guests.some(
            (g) => (g.group === grp || g.tableRequest === grp) && g.id !== data.id && g.tableId !== data.tableId
          );
          if (hasGroupToMove) {
            triggerGroupSeating(data.id, data.tableId, openSeat);
          } else {
            if (guest.tableId) unassignGuest(data.id);
            assignGuest(data.id, data.tableId, openSeat);
          }
        }
      } else if (guest.tableId) {
        // Unassigning — offer to remove the rest of the group from that table too.
        if (guest.group) {
          const groupAtTable = state.guests.filter(
            (g) => g.group === guest.group && g.tableId === guest.tableId && g.id !== data.id
          );
          if (groupAtTable.length > 0) {
            const names = groupAtTable.map((g) => g.name).join(', ');
            if (confirm(`Also remove ${groupAtTable.length} other "${guest.group}" member${groupAtTable.length > 1 ? 's' : ''} from ${state.tables.find((t) => t.id === guest.tableId)?.name || 'this table'}?\n\n${names}`)) {
              groupAtTable.forEach((g) => unassignGuest(g.id));
            }
          }
        }
        unassignGuest(data.id);
      }
    }
    setEditingGuest(null);
  };

  const handleTableSave = (data: { name: string; seatCount: number; shape: Table['shape']; widthFt: number; heightFt: number; id?: string; preselectedGuestIds?: string[]; tableCount?: number }) => {
    const widthPx = data.widthFt * PIXELS_PER_FOOT;
    const heightPx = data.heightFt * PIXELS_PER_FOOT;
    const savedArrangeLayout: 'grid' | 'staggered' = (() => {
      try {
        const s = localStorage.getItem('arrangeSettings');
        if (s) return JSON.parse(s)?.layout || 'grid';
      } catch { /* ignore */ }
      return 'grid';
    })();

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
        updateTable(data.id, { name: data.name, seats: newSeats, shape: data.shape, width: widthPx, height: heightPx });
      }
    } else if (data.tableCount && data.tableCount > 1) {
      const remaining = getRemainingCapacity(widthPx, heightPx);
      const actualCount = Math.min(data.tableCount, remaining);
      if (actualCount <= 0) {
        setCapacityWarning(`Floor is at capacity (${state.tables.length} tables). Increase floor size or remove objects to add more.`);
        setTimeout(() => setCapacityWarning(null), 8000);
        setEditingTable(null);
        return;
      }
      if (actualCount < data.tableCount) {
        setCapacityWarning(`Only ${actualCount} of ${data.tableCount} tables could fit. Increase floor size for more.`);
        setTimeout(() => setCapacityWarning(null), 8000);
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
        name: `${prefix} ${String(startNum + i).padStart(2, '0')}`,
        x: 100, y: 100,
        shape: data.shape,
        seats: Array(data.seatCount).fill(null).map(() => ({ guestId: null })),
        width: widthPx, height: heightPx, rotation: 0,
      }));
      const allTables = [...state.tables, ...newTables];
      const tBody = Math.max(widthPx, heightPx) / 2 + 20 + 14;
      const autoSpacing = tBody * 2 + 5;
      const arranged = computeArrangedTables(allTables, { layout: savedArrangeLayout, spacing: autoSpacing, objectSpacing: 30, maxCols: 0 });
      setTables(arranged);
      setPendingAutoAction(`Added and arranged ${actualCount} tables`);
    } else {
      const remaining = getRemainingCapacity(widthPx, heightPx);
      if (remaining <= 0) {
        setCapacityWarning(`Floor is at capacity (${state.tables.length} tables). Increase floor size or remove objects to add more.`);
        setTimeout(() => setCapacityWarning(null), 8000);
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
        tableName = `Table ${String(maxNum + 1).padStart(2, '0')}`;
      }
      const newTable: Table = {
        id: `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: tableName,
        x: 100, y: 100,
        shape: data.shape,
        seats: Array(data.seatCount).fill(null).map(() => ({ guestId: null })),
        width: widthPx, height: heightPx, rotation: 0,
      };
      const allTables = [...state.tables, newTable];
      const tBody = Math.max(widthPx, heightPx) / 2 + 20 + 14;
      const autoSpacing = tBody * 2 + 5;
      const arranged = computeArrangedTables(allTables, { layout: savedArrangeLayout, spacing: autoSpacing, objectSpacing: 30, maxCols: 0 });
      setTables(arranged);
      if (data.preselectedGuestIds && data.preselectedGuestIds.length > 0) {
        const placedTable = arranged.find((t) => t.id === newTable.id);
        const toNew = data.preselectedGuestIds.slice(0, data.seatCount);
        if (placedTable) {
          toNew.forEach((guestId, i) => assignGuest(guestId, placedTable.id, i));
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
          <div className="bg-white border-b border-gray-200 px-4 py-2 print-hide">
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
                    setTimeout(() => setCapacityWarning(null), 8000);
                  } else {
                    setEditingTable(null); setTableModalOpen(true);
                  }
                }}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Add Table</button>
                {assignedCount > 0 && (
                  <button
                    onClick={() => {
                      if (!confirm(`Remove all ${assignedCount} seat assignments? This cannot be undone.`)) return;
                      clearAllSeating();
                      setPendingAutoAction(null);
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >Clear Seating</button>
                )}
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
          <div className="print-hide"><FloorControls
            floorWidth={state.floorSize.width} floorHeight={state.floorSize.height}
            zoom={state.zoom} isFullscreen={isFullscreen}
            onFloorSizeChange={setFloorSize} onArrangeTables={arrangeTables}
            onAutoSeat={autoSeatByGroup} snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
            showCenterLines={showCenterLines} onToggleCenterLines={() => setShowCenterLines(!showCenterLines)}
            onZoomChange={setZoom}
            onZoomFit={zoomFit} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            onNumberTables={(mode) => setTables(numberTablesForLayout(state.tables, mode))}
            hasTables={state.tables.length > 0}
          /></div>
          {(() => {
            const orgTypes = Array.from(
              new Map(
                state.guests
                  .filter((g) => g.partnerOrgColor && g.partnerOrgName)
                  .map((g) => [g.partnerOrgName!, { name: g.partnerOrgName!, color: g.partnerOrgColor! }])
              ).values()
            ).sort((a, b) => a.name.localeCompare(b.name));
            return (
              <div className="bg-white border-b border-gray-100 px-4 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 print-hide">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Legend</span>
                {[
                  { color: '#ffffff', border: '#d1d5db', label: 'Empty seat' },
                  { color: '#374151', border: '#374151', label: 'Confirmed guest' },
                  { color: '#9333ea', border: '#9333ea', label: 'Additional guest (+1)' },
                  { color: '#fbbf24', border: '#fbbf24', label: 'Placeholder (TBD)' },
                ].map(({ color, border, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: color, borderColor: border }} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
                {orgTypes.map(({ name, color }) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: color, borderColor: color }} />
                    <span className="text-xs text-gray-500">{name}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {capacityWarning && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-sm print-hide">
              <span className="text-red-700 font-medium">{capacityWarning}</span>
              <button onClick={() => setCapacityWarning(null)}
                className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-100 text-xs font-medium">Dismiss</button>
            </div>
          )}
          {pendingAutoAction && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm print-hide">
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
            <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center gap-3 text-sm print-hide">
              <span className="text-indigo-700 font-medium">{selectedTableIds.size + selectedObjectIds.size} selected</span>
              <button onClick={handleDeleteSelected} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium">Delete Selected</button>
              <button onClick={() => { setSelectedTableIds(new Set()); setSelectedObjectIds(new Set()); }} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium text-gray-600">Clear</button>
            </div>
          )}
          <div ref={floorViewRef} id="seating-floor-plan" className="flex-1 min-h-0 p-4 overflow-hidden print:p-0 print:overflow-visible">
            <FloorPlan
              tables={state.tables} guests={state.guests} objects={state.objects}
              floorSize={state.floorSize} zoom={state.zoom}
              selectedGuestId={selectedGuestId} selectedSeatInfo={selectedSeatInfo}
              onTableDrag={(id, x, y) => {
                const gs = 20;
                const t = state.tables.find((tbl) => tbl.id === id);
                const tw = t?.width || DEFAULT_TABLE_WIDTH;
                const th = t?.height || DEFAULT_TABLE_WIDTH;
                const margin = Math.max(tw, th) / 2 + 20 + 14; // half table + seat offset + seat radius
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
                const existingGuest = state.guests.find(
                  (g) => g.tableId === tableId && g.seatIndex === seatIndex
                );
                const draggedGuest = state.guests.find((g) => g.id === guestId);
                if (existingGuest && existingGuest.id !== guestId) {
                  if (!confirm(`Swap ${draggedGuest?.name || 'this guest'} with ${existingGuest.name}?`)) return;
                  // Swap: move existing guest to dragged guest's old seat
                  const fromTable = draggedGuest?.tableId ?? null;
                  const fromSeat = draggedGuest?.seatIndex ?? null;
                  const swapActions: Parameters<typeof batchDispatch>[0] = [
                    { type: 'UNASSIGN_GUEST', payload: guestId },
                    { type: 'UNASSIGN_GUEST', payload: existingGuest.id },
                  ];
                  if (fromTable != null && fromSeat != null) {
                    swapActions.push({ type: 'ASSIGN_GUEST', payload: { guestId: existingGuest.id, tableId: fromTable, seatIndex: fromSeat } });
                  }
                  swapActions.push({ type: 'ASSIGN_GUEST', payload: { guestId, tableId, seatIndex } });
                  batchDispatch(swapActions);
                } else {
                  triggerGroupSeating(guestId, tableId, seatIndex);
                }
                setSelectedGuestId(null);
                setSelectedSeatInfo(null);
              }}
            />
          </div>
        </div>
        <div className="print-hide">
          <GuestSidebar
            guests={state.guests} tables={state.tables}
            selectedGuestId={selectedGuestId} selectedSeatInfo={selectedSeatInfo}
            onGuestSelect={handleGuestSelect}
            onGuestEdit={(guest) => { setEditingGuest(guest); setGuestModalOpen(true); }}
            onUnassign={(guestId) => {
              const guest = state.guests.find((g) => g.id === guestId);
              if (guest?.group && guest.tableId) {
                const groupAtTable = state.guests.filter(
                  (g) => g.group === guest.group && g.tableId === guest.tableId && g.id !== guestId
                );
                if (groupAtTable.length > 0) {
                  const names = groupAtTable.map((g) => g.name).join(', ');
                  if (confirm(`Remove all ${groupAtTable.length + 1} "${guest.group}" members from ${state.tables.find((t) => t.id === guest.tableId)?.name || 'this table'}?\n\n${guest.name}, ${names}`)) {
                    unassignGuest(guestId);
                    groupAtTable.forEach((g) => unassignGuest(g.id));
                    return;
                  }
                }
              }
              unassignGuest(guestId);
            }}
          />
        </div>
      </div>

      {/* Group seating modal */}
      {groupSeatingPending && (() => {
        const { primaryGuestId, targetTableId, groupMembers, tableRequestMembers, availableSeats } = groupSeatingPending;
        const primary = state.guests.find((g) => g.id === primaryGuestId);
        const targetTable = state.tables.find((t) => t.id === targetTableId);
        const seenIds = new Set(groupMembers.map((g) => g.id));
        const allAdditional = [...groupMembers, ...tableRequestMembers.filter((g) => !seenIds.has(g.id))];
        const canFit = Math.min(allAdditional.length, availableSeats.length);
        const willFitAll = canFit >= allAdditional.length;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[26rem] max-w-[90vw] max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-semibold text-gray-900 mb-0.5">Seating {primary?.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Table: {targetTable?.name}</p>

              {groupMembers.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Group — {primary?.group}</p>
                  <ul className="space-y-1.5">
                    {groupMembers.map((g) => (
                      <li key={g.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">{g.name}</span>
                        {g.tableId
                          ? <span className="text-xs text-amber-600">at {state.tables.find((t) => t.id === g.tableId)?.name ?? 'another table'}</span>
                          : <span className="text-xs text-gray-400">unassigned</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tableRequestMembers.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Requested to sit with {primary?.group}</p>
                  <ul className="space-y-1.5">
                    {tableRequestMembers.map((g) => (
                      <li key={g.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">{g.name}</span>
                        {g.tableId
                          ? <span className="text-xs text-amber-600">at {state.tables.find((t) => t.id === g.tableId)?.name ?? 'another table'}</span>
                          : <span className="text-xs text-gray-400">unassigned</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-3">
                {availableSeats.length} seat{availableSeats.length !== 1 ? 's' : ''} available after placing {primary?.name}.
              </p>

              {canFit === 0 && allAdditional.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-sm text-amber-800 flex items-start gap-2">
                  <span>⚠</span><span>No room for additional group members at this table.</span>
                </div>
              )}
              {!willFitAll && canFit > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-sm text-amber-800 flex items-start gap-2">
                  <span>⚠</span>
                  <span>Only {canFit} of {allAdditional.length} can fit — {allAdditional.length - canFit} will remain at their current table.</span>
                </div>
              )}

              <div className="flex gap-2 justify-end flex-wrap">
                <button onClick={() => setGroupSeatingPending(null)} className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleGroupSeatingConfirm(false)} className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded-md hover:bg-indigo-50">
                  Just seat {primary?.name}
                </button>
                {canFit > 0 && (
                  <button onClick={() => handleGroupSeatingConfirm(true)} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Seat {canFit + 1} together{!willFitAll ? ` (${allAdditional.length - canFit} won't fit)` : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      <GuestModal guest={editingGuest} isOpen={guestModalOpen}
        onClose={() => { setGuestModalOpen(false); setEditingGuest(null); }}
        onSave={handleGuestSave}
        existingGroups={Array.from(new Set(state.guests.map((g) => g.group).filter(Boolean))).sort()}
        tables={state.tables}
      />
      <SeatingTableModal table={editingTable} isOpen={tableModalOpen}
        onClose={() => { setTableModalOpen(false); setEditingTable(null); }}
        onSave={handleTableSave}
        onDelete={editingTable ? () => deleteTable(editingTable.id) : undefined}
        onDuplicate={editingTable ? () => { addTable(editingTable.seats.length, `${editingTable.name} (copy)`, editingTable.shape || 'round', editingTable.width || DEFAULT_TABLE_WIDTH, editingTable.height || DEFAULT_TABLE_WIDTH); setEditingTable(null); } : undefined}
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
