'use client';

import { useState, useEffect } from 'react';
import { SeatingGuest, Table } from '@/types/seating';
import { MEAL_OPTIONS, DIETARY_OPTIONS } from '@/lib/seating-constants';

interface DietaryOptionRecord { id: string; name: string; }

interface GuestModalProps {
  guest: SeatingGuest | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { id: string; group: string; meal: string; dietary: string[]; notes: string; tableId: string | null; ticketType: string; seatingRequest: string; tableRequest: string }) => void;
  existingGroups?: string[];
  tables?: Table[];
}

export default function GuestModal({ guest, isOpen, onClose, onSave, existingGroups = [], tables = [] }: GuestModalProps) {
  const [group, setGroup] = useState('');
  const [meal, setMeal] = useState('Standard');
  const [dietary, setDietary] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [tableId, setTableId] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState('Regular');
  const [seatingRequest, setSeatingRequest] = useState('');
  const [tableRequest, setTableRequest] = useState('');
  const [customDietaryOptions, setCustomDietaryOptions] = useState<DietaryOptionRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/lookup/dietary-options')
        .then((r) => r.json())
        .then((data) => setCustomDietaryOptions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (guest) {
      setGroup(guest.group || '');
      setMeal(guest.meal);
      setDietary(guest.dietary);
      setNotes(guest.notes || '');
      setTableId(guest.tableId);
      setTicketType(guest.ticketType || 'Regular');
      setSeatingRequest('');
      setTableRequest('');
    }
  }, [guest, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;
    onSave({ id: guest.id, group: group.trim(), meal, dietary, notes: notes.trim(), tableId, ticketType, seatingRequest: seatingRequest.trim(), tableRequest: tableRequest.trim() });
    onClose();
  };

  const toggleDietary = (option: string) => {
    setDietary((prev) =>
      prev.includes(option) ? prev.filter((d) => d !== option) : [...prev, option]
    );
  };

  if (!isOpen || !guest) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Edit Guest Details</h2>
          <p className="text-sm text-gray-500 mb-4">{guest.name}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
              <input
                type="text"
                list="seating-group-suggestions"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Family, College Friends, Work"
              />
              <datalist id="seating-group-suggestions">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            {tables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                <select
                  value={tableId || ''}
                  onChange={(e) => setTableId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meal Preference</label>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {MEAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type</label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="Regular">Regular</option>
                <option value="Comp">Comp</option>
                <option value="Press">Press</option>
                <option value="Staff">Staff</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            {existingGroups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Request</label>
                <select
                  value={tableRequest}
                  onChange={(e) => setTableRequest(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="">No preference</option>
                  {existingGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Request</label>
              <input
                type="text"
                value={seatingRequest}
                onChange={(e) => setSeatingRequest(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="e.g., accessibility needs, near the stage..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="e.g., needs wheelchair access, VIP..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {[...DIETARY_OPTIONS, ...customDietaryOptions.map((o) => o.name).filter((n) => !DIETARY_OPTIONS.includes(n))].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleDietary(option)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      dietary.includes(option)
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
