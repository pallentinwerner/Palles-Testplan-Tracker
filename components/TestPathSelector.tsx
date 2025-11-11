import React from 'react';

interface TestPathSelectorProps {
  paths: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const TestPathSelector: React.FC<TestPathSelectorProps> = ({ paths, activeIndex, onSelect }) => {
  return (
    <div className="border-b border-slate-600">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {paths.map((path, index) => (
          <button
            key={path}
            onClick={() => onSelect(index)}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeIndex === index
                  ? 'border-indigo-400 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
              }
            `}
          >
            {path}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TestPathSelector;