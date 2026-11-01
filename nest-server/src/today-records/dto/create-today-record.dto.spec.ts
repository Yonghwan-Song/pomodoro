import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTodayRecordDto } from './create-today-record.dto';

const session = {
  kind: 'break' as const,
  startTime: 1000,
  endTime: 2000,
  timeCountedDown: 1000,
  pause: { totalLength: 0, record: [] },
};

describe('CreateTodayRecordDto segments', () => {
  it('rejects a session without segments', async () => {
    const dto = plainToInstance(CreateTodayRecordDto, session);
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('accepts an empty segments array', async () => {
    const dto = plainToInstance(CreateTodayRecordDto, {
      ...session,
      segments: [],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts focus and pause segments', async () => {
    const dto = plainToInstance(CreateTodayRecordDto, {
      ...session,
      segments: [
        {
          owner: ['math', ''],
          duration: 0,
          type: 'focus',
          startTime: 1000,
        },
        {
          owner: ['math', 'task-1'],
          duration: 1000,
          type: 'pause',
          startTime: 1000,
        },
      ],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts segments and pause records with reason', async () => {
    const dto = plainToInstance(CreateTodayRecordDto, {
      ...session,
      pause: {
        totalLength: 1000,
        record: [
          {
            start: 1000,
            end: 2000,
            reason: 'coffee break',
          },
        ],
      },
      segments: [
        {
          owner: ['math', 'task-1'],
          duration: 1000,
          type: 'pause',
          startTime: 1000,
          reason: 'urgent phone call',
        },
      ],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a segment type of break', async () => {
    const dto = plainToInstance(CreateTodayRecordDto, {
      ...session,
      segments: [
        {
          owner: ['math', ''],
          duration: 1000,
          type: 'break',
          startTime: 1000,
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts plannedDuration, editedDuration, isEarlyEnded, earlyEndReason', async () => {
    const dto = plainToInstance(CreateTodayRecordDto, {
      ...session,
      segments: [],
      plannedDuration: 180000,
      editedDuration: 0,
      isEarlyEnded: false,
      earlyEndReason: null,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.plannedDuration).toBe(180000);
    expect(dto.editedDuration).toBe(0);
    expect(dto.isEarlyEnded).toBe(false);
    expect(dto.earlyEndReason).toBeNull();
  });
});

