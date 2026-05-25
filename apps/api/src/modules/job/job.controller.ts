import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto } from './job.dto';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(id);
  }
}
