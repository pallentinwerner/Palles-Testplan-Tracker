import React, { useState, useEffect } from 'react';
import { TestPath } from '../types';

interface PendingAssignment {
  report: TestPath;
  filename: string;
}

interface AssignTesterNameModalProps {
  pendingItems: PendingAssignment[];
  onConfirm: (assignments: { [filename: string]: string }) => void;
  onCancel: () => void;
}

const AssignTesterNameModal: React.FC<AssignTesterNameModalProps> = ({ pendingItems, onConfirm, onCancel }) => {
  const [names, setNames] = useState<{ [filename: string]: string }>({});

  useEffect(() => {
    // Initialize state for inputs
    const initialNames: { [filename: string]: string } = {};
    pendingItems.forEach(item => {
      initialNames[item.filename] = '';
    });
    setNames(initialNames);
  }, [pendingItems]);

  const handleNameChange = (filename: string, name: string) => {
    setNames(prev => ({ ...prev, [filename]: name }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(names);
  };
  
  // FIX: Added a type guard to ensure `name` is a string before calling `.trim()`.
  // This resolves the "Property 'trim' does not exist on type 'unknown'" error.
  const allNamesEntered = Object.values(names).every(name => typeof name === 'string' && name.trim() !== '');

  return (
    <div 
        className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">
              Tester-Namen zuweisen
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Wir konnten den Namen des Testers für die folgenden Dateien nicht automatisch erkennen. Bitte geben Sie ihn manuell ein.
            </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto">
            {pendingItems.map(({ filename }) => (
              <div key={filename}>
                <label htmlFor={`name-for-${filename}`} className="block text-sm font-medium text-gray-300 truncate mb-1">
                  {filename}
                </label>
                <input
                  id={`name-for-${filename}`}
                  type="text"
                  value={names[filename] || ''}
                  onChange={(e) => handleNameChange(filename, e.target.value)}
                  placeholder="Namen des Testers eingeben"
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-200"
                  required
                />
              </div>
            ))}
          </div>
          <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4 flex justify-end items-center space-x-3 mt-auto">
            <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-transparent rounded-md hover:bg-gray-600"
            >
                Abbrechen
            </button>
            <button
              type="submit"
              disabled={!allNamesEntered}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed"
            >
              Namen bestätigen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignTesterNameModal;