
export enum TestStatus {
  NOT_STARTED = 'Nicht begonnen',
  IN_PROGRESS = 'In Bearbeitung',
  PASSED = 'Bestanden',
  FAILED = 'Fehlgeschlagen',
}

export interface TestItem {
  id: number;
  description: string;
  details?: string;
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
        (item.details === undefined || item.details === null || typeof item.details === 'string') &&
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

// --- Centralized Data Migration Logic ---

const ensureDataUrl = (base64String: string): string => {
    // Check for null/undefined/not-a-string, or if it's already a data URL
    if (!base64String || typeof base64String !== 'string' || base64String.startsWith('data:image')) {
        return base64String;
    }
    // Simple "magic number" check for common image types
    if (base64String.startsWith('/9j/')) return `data:image/jpeg;base64,${base64String}`;
    if (base64String.startsWith('iVBORw0KGgo')) return `data:image/png;base64,${base64String}`;
    if (base64String.startsWith('R0lGODlh')) return `data:image/gif;base64,${base64String}`;
    // Fallback for other types or if the check fails
    return `data:image/png;base64,${base64String}`;
};


const migrateReport = (report: any): any => {
    if (!report || !Array.isArray(report.items)) return report;
    
    const statusMap: { [key: string]: TestStatus } = {
      'Not Started': TestStatus.NOT_STARTED,
      'In Progress': TestStatus.IN_PROGRESS,
      'Passed': TestStatus.PASSED,
      'Failed': TestStatus.FAILED,
    };

    const migratedItems = report.items.map((item: any) => {
        if (!item) return item;
        
        const migratedItem = { ...item };
        
        // Status migration from old string values to enum values
        if (typeof item.status === 'string' && statusMap[item.status]) {
            migratedItem.status = statusMap[item.status];
        }
        
        // Image data URL migration for backward compatibility
        if (Array.isArray(item.commentImages)) {
            migratedItem.commentImages = item.commentImages.map((img: any) => {
                if (typeof img === 'string') {
                    return ensureDataUrl(img);
                }
                return null;
            }).filter(Boolean);
        }

        return migratedItem;
    });
    return { ...report, items: migratedItems };
};

/**
 * Takes a parsed JSON object (either a single report or an array of reports)
 * and applies migration logic to ensure backward compatibility.
 * @param parsedJson The data parsed from an imported JSON file.
 * @returns The migrated data.
 */
export const migrateImportedData = (parsedJson: any): any => {
    return Array.isArray(parsedJson) ? parsedJson.map(migrateReport) : migrateReport(parsedJson);
};