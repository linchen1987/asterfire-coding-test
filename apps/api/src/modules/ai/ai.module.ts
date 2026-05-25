import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ExtractController } from './extract.controller';
import { ScoreController } from './score.controller';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [CandidateModule],
  controllers: [ExtractController, ScoreController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
