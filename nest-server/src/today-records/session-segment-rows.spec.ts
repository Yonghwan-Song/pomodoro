import { sessionSegmentInserts } from './session-segment-rows';

describe('sessionSegmentInserts', () => {
  const timerSessionId = 'session-1';

  it('keeps uncategorized, nulls blank owners, and fills ids and task content that exist', () => {
    const rows = sessionSegmentInserts({
      userId: 'user-uuid',
      timerSessionId,
      segments: [
        {
          owner: ['uncategorized', ''],
          duration: 120000,
          type: 'focus',
          startTime: 1000,
        },
        {
          owner: ['  ', ' task-1 '],
          duration: 60000,
          type: 'pause',
          startTime: 121000,
        },
        {
          owner: ['math', 'missing'],
          duration: 180000,
          type: 'focus',
          startTime: 181000,
        },
      ],
      categoryIdByName: new Map([['math', 'category-uuid']]),
      todoistRowIdByTaskId: new Map([['task-1', 'task-uuid']]),
      taskContentByTaskId: new Map([['task-1', 'Task 1 Title']]),
    });

    expect(rows).toEqual([
      {
        userId: 'user-uuid',
        timerSessionId,
        sequenceOrder: 0,
        type: 'focus',
        startTime: 1000,
        duration: 120000,
        categoryName: 'uncategorized',
        categoryId: null,
        taskId: null,
        taskContent: null,
        todoistTaskId: null,
        reason: null,
      },
      {
        userId: 'user-uuid',
        timerSessionId,
        sequenceOrder: 1,
        type: 'pause',
        startTime: 121000,
        duration: 60000,
        categoryName: null,
        categoryId: null,
        taskId: 'task-1',
        taskContent: 'Task 1 Title',
        todoistTaskId: 'task-uuid',
        reason: null,
      },
      {
        userId: 'user-uuid',
        timerSessionId,
        sequenceOrder: 2,
        type: 'focus',
        startTime: 181000,
        duration: 180000,
        categoryName: 'math',
        categoryId: 'category-uuid',
        taskId: 'missing',
        taskContent: null,
        todoistTaskId: null,
        reason: null,
      },
    ]);
  });

  it('maps pause reason correctly and sets focus reason to null', () => {
    const rows = sessionSegmentInserts({
      timerSessionId,
      segments: [
        {
          owner: ['math', 'task-1'],
          duration: 60000,
          type: 'pause',
          startTime: 1000,
          reason: '  phone call  ',
        },
        {
          owner: ['math', 'task-1'],
          duration: 30000,
          type: 'pause',
          startTime: 61000,
          reason: '   ',
        },
        {
          owner: ['math', 'task-1'],
          duration: 120000,
          type: 'focus',
          startTime: 91000,
          reason: 'should be ignored for focus',
        },
      ],
      categoryIdByName: new Map(),
      todoistRowIdByTaskId: new Map(),
    });

    expect(rows[0].reason).toBe('phone call');
    expect(rows[1].reason).toBeNull();
    expect(rows[2].reason).toBeNull();
  });
});
