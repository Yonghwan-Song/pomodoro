import { Test, TestingModule } from '@nestjs/testing';
import { CycleSettingController } from './cycle-setting.controller';
import { CycleSettingService } from './cycle-setting.service';

describe('CycleSettingController', () => {
  let controller: CycleSettingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CycleSettingController],
      providers: [CycleSettingService],
    }).compile();

    controller = module.get<CycleSettingController>(CycleSettingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
