import { Test, TestingModule } from '@nestjs/testing';
import { TodayRecordsController } from './today-records.controller';

describe('RecordsOfTodayController', () => {
  let controller: TodayRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodayRecordsController],
    }).compile();

    controller = module.get<TodayRecordsController>(TodayRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
