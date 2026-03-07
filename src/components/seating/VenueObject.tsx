'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { VenueObject as VenueObjectType } from '@/types/seating';

interface VenueObjectProps {
  object: VenueObjectType;
  zoom: number;
  floorSize: { width: number; height: number };
  onDragEnd: (id: string, x: number, y: number) => void;
  onClick: (id: string, e?: React.MouseEvent) => void;
  onResize?: (id: string, width: number, height: number) => void;
  isSelected?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}

const OBJECT_ICONS: Record<string, string> = {
  stage: '🎭', bar: '🍸', dancefloor: '💃', entrance: '🚪',
  buffet: '🍽️', dj: '🎧', photobooth: '📸', restrooms: '🚻',
  kitchen: '👨‍🍳', custom: '📦',
};

export default function SeatingVenueObject({
  object, zoom, floorSize, onDragEnd, onClick, onResize, isSelected, snapToGrid, gridSize = 20,
}: VenueObjectProps) {
  const objectRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; objX: number; objY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const didDragRef = useRef(false);

  const snap = (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, objX: object.x, objY: object.y };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: object.width, h: object.height };
  };

  const clampX = (x: number, w: number) => Math.max(0, Math.min(floorSize.width - w, x));
  const clampY = (y: number, h: number) => Math.max(0, Math.min(floorSize.height - h, y));

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && resizeStartRef.current && objectRef.current) {
      const dx = (e.clientX - resizeStartRef.current.x) / zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / zoom;
      objectRef.current.style.width = `${Math.max(30, resizeStartRef.current.w + dx)}px`;
      objectRef.current.style.height = `${Math.max(30, resizeStartRef.current.h + dy)}px`;
      return;
    }
    if (!isDragging || !dragStartRef.current || !objectRef.current) return;
    didDragRef.current = true;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    const rawX = snap(dragStartRef.current.objX + dx);
    const rawY = snap(dragStartRef.current.objY + dy);
    objectRef.current.style.left = `${clampX(rawX, object.width)}px`;
    objectRef.current.style.top = `${clampY(rawY, object.height)}px`;

  }, [isDragging, isResizing, zoom, snapToGrid, gridSize, floorSize, object.width, object.height]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isResizing && resizeStartRef.current) {
      const dx = (e.clientX - resizeStartRef.current.x) / zoom;
      const dy = (e.clientY - resizeStartRef.current.y) / zoom;
      const newW = Math.max(30, Math.round(resizeStartRef.current.w + dx));
      const newH = Math.max(30, Math.round(resizeStartRef.current.h + dy));
      setIsResizing(false);
      resizeStartRef.current = null;
      onResize?.(object.id, newW, newH);
      return;
    }
    if (!isDragging || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    const newX = clampX(snap(dragStartRef.current.objX + dx), object.width);
    const newY = clampY(snap(dragStartRef.current.objY + dy), object.height);
    setIsDragging(false);
    dragStartRef.current = null;
    onDragEnd(object.id, newX, newY);

  }, [isDragging, isResizing, zoom, object.id, onDragEnd, onResize, snapToGrid, gridSize, floorSize, object.width, object.height]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const getObjectStyle = () => {
    const styles: Record<string, string> = {
      stage: 'bg-purple-600', bar: 'bg-amber-600', dancefloor: 'bg-pink-500',
      entrance: 'bg-green-600', buffet: 'bg-orange-600', dj: 'bg-indigo-600',
      photobooth: 'bg-cyan-600', restrooms: 'bg-slate-600', kitchen: 'bg-yellow-700',
    };
    return styles[object.type] || 'bg-gray-600';
  };

  const pad = object.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasPadding = pad.top > 0 || pad.right > 0 || pad.bottom > 0 || pad.left > 0;

  return (
    <>
      {hasPadding && (() => {
        const rawLeft = object.x - pad.left;
        const rawTop = object.y - pad.top;
        const rawW = object.width + pad.left + pad.right;
        const rawH = object.height + pad.top + pad.bottom;
        const clampedLeft = Math.max(0, rawLeft);
        const clampedTop = Math.max(0, rawTop);
        const clampedW = Math.min(rawW - (clampedLeft - rawLeft), floorSize.width - clampedLeft);
        const clampedH = Math.min(rawH - (clampedTop - rawTop), floorSize.height - clampedTop);
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: clampedLeft,
              top: clampedTop,
              width: Math.max(0, clampedW),
              height: Math.max(0, clampedH),
              border: '2px dashed rgba(239, 68, 68, 0.4)',
              borderRadius: 4,
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
            }}
          />
        );
      })()}
      <div
        ref={objectRef}
        className={`absolute flex flex-col items-center justify-center text-white font-semibold shadow-md rounded ${
          isDragging ? 'z-50 cursor-grabbing' : isResizing ? 'z-50' : 'cursor-grab'
        } ${getObjectStyle()} ${isSelected ? 'ring-4 ring-indigo-400 ring-offset-2' : ''}`}
        style={{ left: object.x, top: object.y, width: object.width, height: object.height }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (!isDragging && !isResizing && !didDragRef.current) {
            e.stopPropagation();
            onClick(object.id, e);
          }
        }}
      >
        <span className="text-2xl">{OBJECT_ICONS[object.type] || '📦'}</span>
        <span className="text-xs mt-1">{object.label}</span>
        {onResize && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
            style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.6) 50%)' }}
          />
        )}
      </div>
    </>
  );
}
