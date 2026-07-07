import { Test, TestingModule } from '@nestjs/testing';
import { PomodorosController } from './pomodoros.controller';
import { PomodorosService } from './pomodoros.service';

describe('PomodorosController', () => {
  let controller: PomodorosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PomodorosController],
      providers: [PomodorosService],
    }).compile();

    controller = module.get<PomodorosController>(PomodorosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
