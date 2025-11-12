import React from 'react';
import { TestStatus } from '../types';

interface StatusBadgeProps {
  status: TestStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case TestStatus.PASSED:
        return 'bg-green-500/10 text-green-400 ring-green-500/30';
      case TestStatus.FAILED:
        return 'bg-red-500/10 text-red-400 ring-red-500/30';
      case TestStatus.IN_PROGRESS:
        return 'bg-blue-500/10 text-blue-400 ring-blue-500/30';
      case TestStatus.NOT_STARTED:
      default:
        return 'bg-gray-500/10 text-gray-400 ring-gray-500/30';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap flex-shrink-0 ${getStatusStyles()}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;