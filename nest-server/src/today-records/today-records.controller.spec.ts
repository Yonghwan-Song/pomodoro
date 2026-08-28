import { Test, TestingModule } from '@nestjs/testing';
import { TodayRecordsController } from './today-records.controller';
import { TodayRecordsService } from './today-records.service';

describe('RecordsOfTodayController', () => {
  let controller: TodayRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodayRecordsController],
      providers: [
        {
          provide: TodayRecordsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TodayRecordsController>(TodayRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
