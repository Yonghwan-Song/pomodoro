export type SessionSegmentInput = {
  owner: [string, string];
  duration: number;
  type: 'focus' | 'pause';
  startTime: number;
  reason?: string | null;
};

export type SessionSegmentInsert = {
  userId?: string | null;
  timerSessionId: string | null;
  sequenceOrder: number;
  type: 'focus' | 'pause';
  startTime: number;
  duration: number;
  categoryName: string | null;
  categoryId: string | null;
  taskId: string | null;
  taskContent: string | null;
  todoistTaskId: string | null;
  reason: string | null;
};

function ownerText(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeReason(raw?: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function sessionSegmentInserts(args: {
  userId?: string | null;
  timerSessionId: string | null;
  segments: SessionSegmentInput[];
  categoryIdByName: ReadonlyMap<string, string>;
  todoistRowIdByTaskId: ReadonlyMap<string, string>;
  taskContentByTaskId?: ReadonlyMap<string, string | null>;
}): SessionSegmentInsert[] {
  return args.segments.map((segment, sequenceOrder) => {
    const categoryName = ownerText(segment.owner[0]);
    const taskId = ownerText(segment.owner[1]);
    return {
      userId: args.userId ?? null,
      timerSessionId: args.timerSessionId,
      sequenceOrder,
      type: segment.type,
      startTime: segment.startTime,
      duration: segment.duration,
      categoryName,
      categoryId:
        categoryName === null
          ? null
          : (args.categoryIdByName.get(categoryName) ?? null),
      taskId,
      taskContent:
        taskId === null
          ? null
          : (args.taskContentByTaskId?.get(taskId) ?? null),
      todoistTaskId:
        taskId === null
          ? null
          : (args.todoistRowIdByTaskId.get(taskId) ?? null),
      reason: segment.type === 'pause' ? normalizeReason(segment.reason) : null,
    };
  });
}
