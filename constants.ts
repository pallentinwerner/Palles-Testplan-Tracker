
import { TestPath, TestStatus } from './types';

const weg1Items = [
  "Testfall 1",
];

const weg2Items = [
  "Testfall 1",
  "Testfall 2",
];

export const TEST_PATHS: TestPath[] = [
  {
    id: 1,
    title: 'Test Plan 1',
    items: weg1Items.map((desc, index) => ({
      id: index,
      description: desc,
      status: TestStatus.NOT_STARTED,
    })),
  },
  {
    id: 2,
    title: 'Test Plan 2',
    items: weg2Items.map((desc, index) => ({
      id: index,
      description: desc,
      status: TestStatus.NOT_STARTED,
    })),
  },
];
