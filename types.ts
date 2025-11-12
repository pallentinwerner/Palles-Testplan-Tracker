
export enum TestStatus {
  NOT_STARTED = 'Nicht begonnen',
  IN_PROGRESS = 'In Bearbeitung',
  PASSED = 'Bestanden',
  FAILED = 'Fehlgeschlagen',
}

export interface TestItem {
  id: number;
  description: string;
  status: TestStatus;
  comment?: string;
  commentImages?: string[];
}

export interface TestPath {
  id: number;
  title: string;
  items: TestItem[];
  testerName?: string;
  exportTimestamp?: string;
}

// --- Centralized, Robust Type Guards ---

export const isTestItem = (item: any): item is TestItem => {
    if (item == null || typeof item !== 'object') return false;
    return typeof item.id === 'number' &&
        typeof item.description === 'string' &&
        typeof item.status === 'string' &&
        Object.values(TestStatus).includes(item.status as TestStatus) &&
        (item.comment === undefined || item.comment === null || typeof item.comment === 'string') &&
        (item.commentImages === undefined || item.commentImages === null || (Array.isArray(item.commentImages) && item.commentImages.every(img => typeof img === 'string')));
};

export const isTestPath = (obj: any): obj is TestPath => {
  if (obj == null || typeof obj !== 'object') return false;
  return typeof obj.id === 'number' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.items) &&
    obj.items.every(isTestItem) &&
    (obj.testerName === undefined || obj.testerName === null || typeof obj.testerName === 'string') &&
    (obj.exportTimestamp === undefined || obj.exportTimestamp === null || typeof obj.exportTimestamp === 'string');
};

export const isTestPathArray = (obj: any): obj is TestPath[] => {
    return Array.isArray(obj) && obj.every(isTestPath);
};