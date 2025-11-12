import React from 'react';

interface TestPathSelectorProps {
  paths: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const TestPathSelector: React.FC<TestPathSelectorProps> = ({ paths, activeIndex, onSelect }) => {
  return (
    <div className="border-b border-gray-700">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {paths.map((path, index) => (
          <button
            key={path}
            onClick={() => onSelect(index)}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeIndex === index
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
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