'use client';

import { useEffect, useRef } from 'react';
import { SeatingGuest, Table, VenueObject } from '@/types/seating';
import SeatingTable from './Table';
import SeatingVenueObject from './VenueObject';

interface FloorPlanProps {
  tables: Table[];
  guests: SeatingGuest[];
  objects: VenueObject[];
  floorSize: { width: number; height: number };
  zoom: number;
  selectedGuestId: string | null;
  selectedSeatInfo: { tableId: string; seatIndex: number } | null;
  onTableDrag: (id: string, x: number, y: number) => void;
  onObjectDrag: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seatIndex: number, guestId: string | null) => void;
  onTableClick: (tableId: string, e?: React.MouseEvent | MouseEvent) => void;
  onObjectClick: (objectId: string, e?: React.MouseEvent | MouseEvent) => void;
  selectedTableIds?: Set<string>;
  selectedObjectIds?: Set<string>;
  onZoomChange?: (zoom: number) => void;
  onObjectResize?: (id: string, width: number, height: number) => void;
  onGuestDrop?: (guestId: string, tableId: string, seatIndex: number) => void;
  snapToGrid?: boolean;
  gridSize?: number;
  showCenterLines?: boolean;
}

export default function FloorPlan({
  tables,
  guests,
  objects,
  floorSize,
  zoom,
  selectedGuestId,
  selectedSeatInfo,
  onTableDrag,
  onObjectDrag,
  onSeatClick,
  onTableClick,
  onObjectClick,
  onZoomChange,
  onObjectResize,
  onGuestDrop,
  selectedTableIds,
  selectedObjectIds,
  snapToGrid,
  gridSize,
  showCenterLines,
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onZoomChange) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
      onZoomChange(newZoom);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomChange]);

  return (
    <div
      ref={containerRef}
      className="floor-plan relative overflow-auto bg-gray-100 rounded-lg"
      style={{ width: '100%', height: '100%' }}
    >
      <div style={{
        width: (floorSize.width + 240) * zoom,
        height: (floorSize.height + 240) * zoom,
        display: 'inline-block',
      }}>
      <div
        className="relative bg-white border border-gray-300"
        style={{
          width: floorSize.width,
          height: floorSize.height,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Center lines */}
        {showCenterLines && (
          <>
            <div className="absolute pointer-events-none" style={{
              left: floorSize.width / 2, top: 0, width: 0, height: floorSize.height,
              borderLeft: '1px dashed rgba(156, 163, 175, 0.5)',
            }} />
            <div className="absolute pointer-events-none" style={{
              left: 0, top: floorSize.height / 2, width: floorSize.width, height: 0,
              borderTop: '1px dashed rgba(156, 163, 175, 0.5)',
            }} />
          </>
        )}

        {objects.map((object) => (
          <SeatingVenueObject
            key={object.id}
            object={object}
            zoom={zoom}
            floorSize={floorSize}
            onDragEnd={onObjectDrag}
            onClick={onObjectClick}
            onResize={onObjectResize}
            isSelected={selectedObjectIds?.has(object.id)}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        ))}

        {tables.map((table) => (
          <SeatingTable
            key={table.id}
            table={table}
            guests={guests}
            zoom={zoom}
            floorSize={floorSize}
            onDragEnd={onTableDrag}
            onSeatClick={onSeatClick}
            onTableClick={onTableClick}
            onGuestDrop={onGuestDrop}
            selectedGuestId={selectedGuestId}
            selectedSeatInfo={selectedSeatInfo}
            isMultiSelected={selectedTableIds?.has(table.id)}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
