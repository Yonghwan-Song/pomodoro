import { Test, TestingModule } from '@nestjs/testing';
import { PomodorosService } from './pomodoros.service';
import { PG_DB_BY_DRIZZLE } from 'src/postgresql/pg-provider';

describe('PomodorosService', () => {
  let service: PomodorosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PomodorosService,
        { provide: PG_DB_BY_DRIZZLE, useValue: {} },
      ],
    }).compile();

    service = module.get<PomodorosService>(PomodorosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
