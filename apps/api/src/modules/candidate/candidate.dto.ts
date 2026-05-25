import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCandidateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() city?: string;
}

export class UpdateStatusDto {
  @IsString()
  status: string;
}

export class EducationDto {
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() major?: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() graduatedAt?: string;
}

export class WorkExperienceDto {
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() summary?: string;
}

export class SkillDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
}

export class ProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() techStack?: string[];
  @IsOptional() @IsString() responsibilities?: string;
  @IsOptional() @IsString() highlights?: string;
}
