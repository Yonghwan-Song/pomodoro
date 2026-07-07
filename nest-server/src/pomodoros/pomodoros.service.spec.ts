import { Test, TestingModule } from '@nestjs/testing';
import { PomodorosService } from './pomodoros.service';

describe('PomodorosService', () => {
  let service: PomodorosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PomodorosService],
    }).compile();

    service = module.get<PomodorosService>(PomodorosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
