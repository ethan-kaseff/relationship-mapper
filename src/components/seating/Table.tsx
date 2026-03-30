'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Table as TableType, SeatingGuest } from '@/types/seating';
import { TABLE_COLORS } from '@/lib/seating-constants';

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

  const tableSize = 100;
  const seatSize = 28;
  const seatDistance = tableSize / 2 + 20;
  const color = TABLE_COLORS[0];

  const margin = seatDistance + seatSize / 2; // 84 - keeps entire table including chairs on floor
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
    tableRef.current.style.left = `${newX - tableSize / 2 - seatDistance}px`;
    tableRef.current.style.top = `${newY - tableSize / 2 - seatDistance}px`;
  }, [isDragging, zoom, tableSize, seatDistance, snapFn, clampX, clampY]);

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

  return (
    <div
      ref={tableRef}
      className={`absolute ${isDragging ? 'z-50 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: table.x - tableSize / 2 - seatDistance,
        top: table.y - tableSize / 2 - seatDistance,
        width: tableSize + seatDistance * 2,
        height: tableSize + seatDistance * 2,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`absolute rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg cursor-pointer hover:opacity-90 ${
          isMultiSelected ? 'ring-4 ring-indigo-400 ring-offset-2' : ''
        }`}
        style={{
          width: tableSize,
          height: tableSize,
          left: seatDistance,
          top: seatDistance,
          backgroundColor: color,
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

      {table.seats.map((_, index) => {
        const angle = (index / table.seats.length) * 2 * Math.PI - Math.PI / 2;
        const seatX = seatDistance + tableSize / 2 + Math.cos(angle) * seatDistance - seatSize / 2;
        const seatY = seatDistance + tableSize / 2 + Math.sin(angle) * seatDistance - seatSize / 2;
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
