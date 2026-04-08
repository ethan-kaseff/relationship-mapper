'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { SeatingGuest, Table, VenueObject, SeatingLayout } from '@/types/seating';
import { DEFAULT_SEATING_LAYOUT, DEFAULT_TABLE_WIDTH } from '@/lib/seating-constants';

const MAX_HISTORY = 50;

export interface SeatingState {
  tables: Table[];
  guests: SeatingGuest[];
  objects: VenueObject[];
  floorSize: { width: number; height: number };
  zoom: number;
}

export type SeatingAction =
  | { type: 'SET_DATA'; payload: SeatingState }
  | { type: 'ADD_TABLE'; payload: Table }
  | { type: 'ADD_TABLES'; payload: Table[] }
  | { type: 'SET_TABLES'; payload: Table[] }
  | { type: 'UPDATE_TABLE'; payload: { id: string; updates: Partial<Table> } }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'UPDATE_GUEST'; payload: { id: string; updates: Partial<SeatingGuest> } }
  | { type: 'ASSIGN_GUEST'; payload: { guestId: string; tableId: string; seatIndex: number } }
  | { type: 'UNASSIGN_GUEST'; payload: string }
  | { type: 'ADD_OBJECT'; payload: VenueObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<VenueObject> } }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_FLOOR_SIZE'; payload: { width: number; height: number } };

interface HistoryState {
  past: SeatingState[];
  present: SeatingState;
  future: SeatingState[];
}

type HistoryAction =
  | { type: 'DISPATCH'; action: SeatingAction }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function layoutToState(layout: SeatingLayout | null, guests: SeatingGuest[]): SeatingState {
  const l = layout || DEFAULT_SEATING_LAYOUT;
  return {
    tables: l.tables || [],
    guests,
    objects: l.objects || [],
    floorSize: { width: l.floorWidth || 1200, height: l.floorHeight || 800 },
    zoom: l.zoom || 1,
  };
}

function seatingReducer(state: SeatingState, action: SeatingAction): SeatingState {
  switch (action.type) {
    case 'SET_DATA':
      return action.payload;

    case 'ADD_TABLE':
      return { ...state, tables: [...state.tables, action.payload] };

    case 'ADD_TABLES':
      return { ...state, tables: [...state.tables, ...action.payload] };

    case 'SET_TABLES':
      return { ...state, tables: action.payload };

    case 'UPDATE_TABLE':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };

    case 'DELETE_TABLE': {
      const tableId = action.payload;
      return {
        ...state,
        tables: state.tables.filter((t) => t.id !== tableId),
        guests: state.guests.map((g) =>
          g.tableId === tableId ? { ...g, tableId: null, seatIndex: null } : g
        ),
      };
    }

    case 'UPDATE_GUEST':
      return {
        ...state,
        guests: state.guests.map((g) =>
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        ),
      };

    case 'ASSIGN_GUEST': {
      const { guestId, tableId, seatIndex } = action.payload;
      const updatedGuests = state.guests.map((g) => {
        if (g.tableId === tableId && g.seatIndex === seatIndex) {
          return { ...g, tableId: null, seatIndex: null };
        }
        if (g.id === guestId) {
          return { ...g, tableId, seatIndex };
        }
        return g;
      });
      return { ...state, guests: updatedGuests };
    }

    case 'UNASSIGN_GUEST':
      return {
        ...state,
        guests: state.guests.map((g) =>
          g.id === action.payload ? { ...g, tableId: null, seatIndex: null } : g
        ),
      };

    case 'ADD_OBJECT':
      return { ...state, objects: [...state.objects, action.payload] };

    case 'UPDATE_OBJECT':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id ? { ...o, ...action.payload.updates } : o
        ),
      };

    case 'DELETE_OBJECT':
      return {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.payload),
      };

    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };

    case 'SET_FLOOR_SIZE':
      return { ...state, floorSize: action.payload };

    default:
      return state;
  }
}

const NON_UNDOABLE_ACTIONS = new Set(['SET_ZOOM', 'SET_FLOOR_SIZE']);

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'DISPATCH': {
      const newPresent = seatingReducer(state.present, action.action);
      if (newPresent === state.present) return state;

      if (NON_UNDOABLE_ACTIONS.has(action.action.type)) {
        return { ...state, present: newPresent };
      }

      const past = [...state.past, state.present].slice(-MAX_HISTORY);
      return { past, present: newPresent, future: [] };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    default:
      return state;
  }
}

export function useSeatingChart(
  initialLayout: SeatingLayout | null,
  initialGuests: SeatingGuest[],
  onSave?: (state: SeatingState) => void
) {
  const [historyState, historyDispatch] = useReducer(historyReducer, {
    past: [],
    present: layoutToState(initialLayout, initialGuests),
    future: [],
  });

  const state = historyState.present;
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const dispatch = useCallback((action: SeatingAction) => {
    historyDispatch({ type: 'DISPATCH', action });
  }, []);

  const undo = useCallback(() => {
    historyDispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    historyDispatch({ type: 'REDO' });
  }, []);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!onSave) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave(state);
      saveTimeoutRef.current = null;
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, onSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        onSaveRef.current?.(stateRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addTable = useCallback((
    seatCount: number = 8,
    name?: string,
    shape: Table['shape'] = 'round',
    width: number = DEFAULT_TABLE_WIDTH,
    height: number = DEFAULT_TABLE_WIDTH,
  ) => {
    const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tableNumber = state.tables.length + 1;
    const table: Table = {
      id,
      name: name || `Table ${tableNumber}`,
      x: 120 + (state.tables.length % 4) * 180,
      y: 120 + Math.floor(state.tables.length / 4) * 180,
      shape,
      seats: Array(seatCount).fill(null).map(() => ({ guestId: null })),
      width,
      height,
      rotation: 0,
    };
    dispatch({ type: 'ADD_TABLE', payload: table });
    return table;
  }, [state.tables.length, dispatch]);

  const addTables = useCallback((tables: { seatCount: number; name: string; shape?: Table['shape']; width?: number; height?: number }[]) => {
    const newTables: Table[] = tables.map((t, i) => ({
      id: `table-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: t.name,
      x: 120 + ((state.tables.length + i) % 4) * 180,
      y: 120 + Math.floor((state.tables.length + i) / 4) * 180,
      shape: t.shape || 'round',
      seats: Array(t.seatCount).fill(null).map(() => ({ guestId: null })),
      width: t.width || DEFAULT_TABLE_WIDTH,
      height: t.height || DEFAULT_TABLE_WIDTH,
      rotation: 0,
    }));
    dispatch({ type: 'ADD_TABLES', payload: newTables });
    return newTables;
  }, [state.tables.length, dispatch]);

  const setTables = useCallback((tables: Table[]) => {
    dispatch({ type: 'SET_TABLES', payload: tables });
  }, [dispatch]);

  const updateTable = useCallback((id: string, updates: Partial<Table>) => {
    dispatch({ type: 'UPDATE_TABLE', payload: { id, updates } });
  }, [dispatch]);

  const deleteTable = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TABLE', payload: id });
  }, [dispatch]);

  const updateGuest = useCallback((id: string, updates: Partial<SeatingGuest>) => {
    dispatch({ type: 'UPDATE_GUEST', payload: { id, updates } });
  }, [dispatch]);

  const assignGuest = useCallback(
    (guestId: string, tableId: string, seatIndex: number) => {
      dispatch({ type: 'ASSIGN_GUEST', payload: { guestId, tableId, seatIndex } });
    },
    [dispatch]
  );

  const unassignGuest = useCallback((guestId: string) => {
    dispatch({ type: 'UNASSIGN_GUEST', payload: guestId });
  }, [dispatch]);

  const addObject = useCallback((object: Omit<VenueObject, 'id'>) => {
    const id = `object-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newObject: VenueObject = { ...object, id };
    dispatch({ type: 'ADD_OBJECT', payload: newObject });
    return newObject;
  }, [dispatch]);

  const updateObject = useCallback((id: string, updates: Partial<VenueObject>) => {
    dispatch({ type: 'UPDATE_OBJECT', payload: { id, updates } });
  }, [dispatch]);

  const deleteObject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OBJECT', payload: id });
  }, [dispatch]);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(0.5, Math.min(2, zoom)) });
  }, [dispatch]);

  const setData = useCallback((data: SeatingState) => {
    dispatch({ type: 'SET_DATA', payload: data });
  }, [dispatch]);

  const setFloorSize = useCallback((width: number, height: number) => {
    dispatch({ type: 'SET_FLOOR_SIZE', payload: { width, height } });
  }, [dispatch]);

  const getUnassignedGuests = useCallback(() => {
    return state.guests.filter((g) => g.tableId === null);
  }, [state.guests]);

  const getGuestById = useCallback(
    (id: string) => {
      return state.guests.find((g) => g.id === id) || null;
    },
    [state.guests]
  );

  const getTableById = useCallback(
    (id: string) => {
      return state.tables.find((t) => t.id === id) || null;
    },
    [state.tables]
  );

  return {
    state,
    dispatch,
    addTable,
    addTables,
    setTables,
    updateTable,
    deleteTable,
    updateGuest,
    assignGuest,
    unassignGuest,
    addObject,
    updateObject,
    deleteObject,
    setZoom,
    setData,
    setFloorSize,
    getUnassignedGuests,
    getGuestById,
    getTableById,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
