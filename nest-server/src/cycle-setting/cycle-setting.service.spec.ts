import { Test, TestingModule } from '@nestjs/testing';
import { CycleSettingService } from './cycle-setting.service';

describe('CycleSettingService', () => {
  let service: CycleSettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CycleSettingService],
    }).compile();

    service = module.get<CycleSettingService>(CycleSettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
