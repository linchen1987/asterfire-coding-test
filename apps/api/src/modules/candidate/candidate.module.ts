import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { UploadController } from './upload.controller';
import { CandidateService } from './candidate.service';

@Module({
  controllers: [CandidateController, UploadController],
  providers: [CandidateService],
  exports: [CandidateService],
})
export class CandidateModule {}
