import { Test, TestingModule } from '@nestjs/testing';
import { TodayRecordsService } from './today-records.service';

describe('RecordsOfTodayService', () => {
  let service: TodayRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodayRecordsService],
    }).compile();

    service = module.get<TodayRecordsService>(TodayRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
