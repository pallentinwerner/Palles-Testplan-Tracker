import React from 'react';
import { TestItem, TestStatus } from '../types';
import TestItemRow from './TestItemRow';

interface TestPlanViewProps {
  items: TestItem[];
  onStatusChange: (itemId: number, newStatus: TestStatus) => void;
  onOpenCommentModal: (itemId: number) => void;
}

const TestPlanView: React.FC<TestPlanViewProps> = ({ items, onStatusChange, onOpenCommentModal }) => {
  return (
    <div className="border border-gray-700 rounded-lg">
      <div className="divide-y divide-gray-700">
        {items.map((item, index) => (
          <TestItemRow
            key={item.id}
            item={item}
            itemNumber={index + 1}
            onStatusChange={onStatusChange}
            onOpenCommentModal={onOpenCommentModal}
          />
        ))}
      </div>
    </div>
  );
};

export default TestPlanView;