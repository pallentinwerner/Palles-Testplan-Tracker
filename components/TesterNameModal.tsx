
import React, { useState } from 'react';

interface TesterNameModalProps {
  onNameSubmit: (name: string) => void;
}

const TesterNameModal: React.FC<TesterNameModalProps> = ({ onNameSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNameSubmit(name.trim());
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white">
              Willkommen beim Testplan-Tracker
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Bitte geben Sie Ihren Namen ein, um zu beginnen.
            </p>
          </div>
          <div className="px-6 pb-6">
            <label htmlFor="testerName" className="sr-only">Name des Testers</label>
            <input
              id="testerName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ihr Name"
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-gray-200 placeholder-gray-500"
              aria-label="Eingabefeld für Tester-Namen"
              autoFocus
              required
            />
          </div>
          <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4 flex justify-end items-center">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors disabled:bg-blue-600/50 disabled:cursor-not-allowed"
            >
              Test starten
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TesterNameModal;