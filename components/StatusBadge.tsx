import React from 'react';
import { TestStatus } from '../types';

interface StatusBadgeProps {
  status: TestStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case TestStatus.PASSED:
        return 'bg-green-500/20 text-green-300 ring-green-500/30';
      case TestStatus.FAILED:
        return 'bg-red-500/20 text-red-300 ring-red-500/30';
      case TestStatus.IN_PROGRESS:
        return 'bg-blue-500/20 text-blue-300 ring-blue-500/30';
      case TestStatus.NOT_STARTED:
      default:
        return 'bg-slate-500/20 text-slate-300 ring-slate-500/30';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset w-24 justify-center ${getStatusStyles()}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;