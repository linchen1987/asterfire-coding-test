import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { UpdateCandidateDto, UpdateStatusDto } from './candidate.dto';

@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.candidateService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidateService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCandidateDto) {
    return this.candidateService.update(id, dto);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.candidateService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.candidateService.remove(id);
  }

  @Put(':id/profile')
  saveProfile(@Param('id') id: string, @Body() body: any) {
    return this.candidateService.saveProfile(id, body);
  }

  @Get(':id/upload-status')
  getUploadStatus(@Param('id') id: string) {
    return this.candidateService.getUploadStatus(id);
  }
}
