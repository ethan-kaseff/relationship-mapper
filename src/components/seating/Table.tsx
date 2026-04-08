'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Table as TableType, SeatingGuest } from '@/types/seating';
import { TABLE_COLORS, DEFAULT_TABLE_WIDTH } from '@/lib/seating-constants';

interface TableProps {
  table: TableType;
  guests: SeatingGuest[];
  zoom: number;
  floorSize: { width: number; height: number };
  onDragEnd: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seatIndex: number, guestId: string | null) => void;
  onTableClick: (tableId: string, e?: React.MouseEvent | MouseEvent) => void;
  onGuestDrop?: (guestId: string, tableId: string, seatIndex: number) => void;
  selectedGuestId: string | null;
  selectedSeatInfo: { tableId: string; seatIndex: number } | null;
  isMultiSelected?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}

// Place seats evenly around a rectangle perimeter, offset outward
function getRectSeatPositions(
  tableW: number,
  tableH: number,
  seatCount: number,
  seatOffset: number,
): { x: number; y: number }[] {
  const perimeter = 2 * (tableW + tableH);
  const positions: { x: number; y: number }[] = [];
  const halfW = tableW / 2;
  const halfH = tableH / 2;

  for (let i = 0; i < seatCount; i++) {
    const d = ((i + 0.5) / seatCount) * perimeter;
    let px: number, py: number, ox: number, oy: number;

    if (d < tableW) {
      // Top edge (left to right)
      px = -halfW + d;
      py = -halfH;
      ox = 0;
      oy = -seatOffset;
    } else if (d < tableW + tableH) {
      // Right edge (top to bottom)
      px = halfW;
      py = -halfH + (d - tableW);
      ox = seatOffset;
      oy = 0;
    } else if (d < 2 * tableW + tableH) {
      // Bottom edge (right to left)
      px = halfW - (d - tableW - tableH);
      py = halfH;
      ox = 0;
      oy = seatOffset;
    } else {
      // Left edge (bottom to top)
      px = -halfW;
      py = halfH - (d - 2 * tableW - tableH);
      ox = -seatOffset;
      oy = 0;
    }

    positions.push({ x: px + ox, y: py + oy });
  }

  return positions;
}

// Place seats around an ellipse (works for circle too)
function getEllipseSeatPositions(
  radiusX: number,
  radiusY: number,
  seatCount: number,
  seatOffset: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < seatCount; i++) {
    const angle = (i / seatCount) * 2 * Math.PI - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ex = radiusX * cos;
    const ey = radiusY * sin;
    // Normal direction for offset (normalized)
    const nx = ex / (radiusX * radiusX) || 0;
    const ny = ey / (radiusY * radiusY) || 0;
    const len = Math.sqrt(nx * nx + ny * ny) || 1;
    positions.push({
      x: ex + (nx / len) * seatOffset,
      y: ey + (ny / len) * seatOffset,
    });
  }

  return positions;
}

export default function SeatingTable({
  table,
  guests,
  zoom,
  floorSize,
  onDragEnd,
  onSeatClick,
  onTableClick,
  onGuestDrop,
  selectedGuestId,
  selectedSeatInfo,
  isMultiSelected,
  snapToGrid,
  gridSize = 20,
}: TableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; tableX: number; tableY: number } | null>(null);
  const didDragRef = useRef(false);

  // Backward compat: old tables without proper width/height
  const shape = table.shape || 'round';
  const tableW = table.width || DEFAULT_TABLE_WIDTH;
  const tableH = table.height || DEFAULT_TABLE_WIDTH;

  const seatSize = 28;
  const seatOffset = 20;
  const color = TABLE_COLORS[0];

  // Compute seat positions relative to table center
  const seatPositions = (() => {
    switch (shape) {
      case 'round':
        return getEllipseSeatPositions(tableW / 2, tableW / 2, table.seats.length, seatOffset);
      case 'oval':
        return getEllipseSeatPositions(tableW / 2, tableH / 2, table.seats.length, seatOffset);
      case 'square':
        return getRectSeatPositions(tableW, tableW, table.seats.length, seatOffset);
      case 'rectangle':
        return getRectSeatPositions(tableW, tableH, table.seats.length, seatOffset);
      default:
        return getEllipseSeatPositions(tableW / 2, tableW / 2, table.seats.length, seatOffset);
    }
  })();

  const effectiveW = (shape === 'square' || shape === 'round') ? tableW : tableW;
  const effectiveH = (shape === 'round' || shape === 'square') ? tableW : tableH;

  // Find bounding box of all seats to size the container
  const allXs = seatPositions.map((p) => p.x);
  const allYs = seatPositions.map((p) => p.y);
  const minSeatX = seatPositions.length > 0 ? Math.min(...allXs) - seatSize / 2 : -effectiveW / 2;
  const maxSeatX = seatPositions.length > 0 ? Math.max(...allXs) + seatSize / 2 : effectiveW / 2;
  const minSeatY = seatPositions.length > 0 ? Math.min(...allYs) - seatSize / 2 : -effectiveH / 2;
  const maxSeatY = seatPositions.length > 0 ? Math.max(...allYs) + seatSize / 2 : effectiveH / 2;

  const boundsLeft = Math.min(-effectiveW / 2, minSeatX);
  const boundsTop = Math.min(-effectiveH / 2, minSeatY);
  const boundsRight = Math.max(effectiveW / 2, maxSeatX);
  const boundsBottom = Math.max(effectiveH / 2, maxSeatY);

  const containerW = boundsRight - boundsLeft;
  const containerH = boundsBottom - boundsTop;
  const centerOffsetX = -boundsLeft;
  const centerOffsetY = -boundsTop;

  // Margin for clamping: half of container size
  const margin = Math.max(containerW, containerH) / 2;

  const snapFn = useCallback(
    (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : v,
    [snapToGrid, gridSize]
  );
  const clampX = useCallback(
    (x: number) => Math.max(margin, Math.min(floorSize.width - margin, x)),
    [margin, floorSize.width]
  );
  const clampY = useCallback(
    (y: number) => Math.max(margin, Math.min(floorSize.height - margin, y)),
    [margin, floorSize.height]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('table-seat')) return;
    e.preventDefault();
    setIsDragging(true);
    didDragRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tableX: table.x,
      tableY: table.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !tableRef.current) return;
    didDragRef.current = true;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    const newX = clampX(snapFn(dragStartRef.current.tableX + dx));
    const newY = clampY(snapFn(dragStartRef.current.tableY + dy));
    tableRef.current.style.left = `${newX - containerW / 2}px`;
    tableRef.current.style.top = `${newY - containerH / 2}px`;
  }, [isDragging, zoom, containerW, containerH, snapFn, clampX, clampY]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    const newX = clampX(snapFn(dragStartRef.current.tableX + dx));
    const newY = clampY(snapFn(dragStartRef.current.tableY + dy));
    setIsDragging(false);
    dragStartRef.current = null;
    onDragEnd(table.id, newX, newY);
  }, [isDragging, zoom, table.id, onDragEnd, snapFn, clampX, clampY]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getGuestForSeat = (seatIndex: number): SeatingGuest | undefined => {
    return guests.find((g) => g.tableId === table.id && g.seatIndex === seatIndex);
  };

  const isSeatSelected = (seatIndex: number): boolean => {
    return selectedSeatInfo?.tableId === table.id && selectedSeatInfo?.seatIndex === seatIndex;
  };

  // Table body border radius based on shape
  const tableBorderRadius = (() => {
    switch (shape) {
      case 'round':
      case 'oval':
        return '9999px';
      case 'square':
      case 'rectangle':
        return '8px';
      default:
        return '9999px';
    }
  })();

  return (
    <div
      ref={tableRef}
      className={`absolute ${isDragging ? 'z-50 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: table.x - containerW / 2,
        top: table.y - containerH / 2,
        width: containerW,
        height: containerH,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Table center */}
      <div
        className={`absolute flex items-center justify-center text-white font-semibold text-sm shadow-lg cursor-pointer hover:opacity-90 ${
          isMultiSelected ? 'ring-4 ring-indigo-400 ring-offset-2' : ''
        }`}
        style={{
          width: effectiveW,
          height: effectiveH,
          left: centerOffsetX - effectiveW / 2,
          top: centerOffsetY - effectiveH / 2,
          backgroundColor: color,
          borderRadius: tableBorderRadius,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!didDragRef.current) onTableClick(table.id, e);
        }}
      >
        <div className="flex flex-col items-center">
          <span>{table.name}</span>
          <span className="text-xs opacity-80 font-normal">
            {guests.filter((g) => g.tableId === table.id).length}/{table.seats.length}
          </span>
        </div>
      </div>

      {/* Seats */}
      {table.seats.map((_, index) => {
        const pos = seatPositions[index];
        if (!pos) return null;
        const seatX = centerOffsetX + pos.x - seatSize / 2;
        const seatY = centerOffsetY + pos.y - seatSize / 2;
        const guest = getGuestForSeat(index);
        const isSelected = isSeatSelected(index);
        const isAvailableForGuest = selectedGuestId && !guest;

        return (
          <div
            key={index}
            className={`table-seat absolute rounded-full border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
              isSelected
                ? 'bg-indigo-200 border-indigo-500 ring-2 ring-indigo-400'
                : guest
                ? 'bg-gray-700 border-gray-700 text-white hover:ring-2 hover:ring-gray-400'
                : isAvailableForGuest
                ? 'bg-green-100 border-green-400 hover:bg-green-200 animate-pulse'
                : 'bg-white border-gray-300 hover:border-gray-400'
            }`}
            style={{ width: seatSize, height: seatSize, left: seatX, top: seatY }}
            draggable={!!guest}
            onDragStart={(e) => {
              if (guest) {
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
            onClick={(e) => {
              e.stopPropagation();
              onSeatClick(table.id, index, guest?.id || null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const guestId = e.dataTransfer.getData('guestId');
              if (guestId && onGuestDrop) {
                onGuestDrop(guestId, table.id, index);
              }
            }}
            title={guest?.name || (selectedGuestId ? 'Click to place guest here' : `Seat ${index + 1}`)}
          >
            {guest ? guest.name.charAt(0).toUpperCase() : ''}
          </div>
        );
      })}
    </div>
  );
}
