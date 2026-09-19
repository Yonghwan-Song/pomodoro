import { Test, TestingModule } from '@nestjs/testing';
import { PG_DB_BY_DRIZZLE } from 'src/postgresql/pg-provider';
import { TodayRecordsService } from './today-records.service';

describe('RecordsOfTodayService', () => {
  let service: TodayRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodayRecordsService,
        { provide: PG_DB_BY_DRIZZLE, useValue: {} },
      ],
    }).compile();

    service = module.get<TodayRecordsService>(TodayRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
