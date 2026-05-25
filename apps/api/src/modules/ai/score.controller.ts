import {
  Controller,
  Post,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { CandidateService } from '../candidate/candidate.service';
import { getSqlite } from '../../db/connection';

@Controller('candidates')
export class ScoreController {
  constructor(
    private readonly aiService: AiService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post(':id/score')
  async score(@Param('id') id: string) {
    const candidate = this.candidateService.findOne(id);

    if (candidate.uploadStatus !== 'completed') {
      throw new BadRequestException('Cannot score: candidate upload not completed');
    }

    const db = getSqlite();
    const jobRow = db.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(candidate.jobId) as any;
    if (!jobRow) throw new NotFoundException('Associated job not found');

    const candidateJson = JSON.stringify({
      name: candidate.name,
      phone: candidate.phone,
      email: candidate.email,
      city: candidate.city,
      educations: candidate.educations,
      workExperiences: candidate.workExperiences,
      skills: candidate.skills,
      projects: candidate.projects,
    });

    const jobJson = JSON.stringify({
      title: jobRow.title,
      description: jobRow.description,
      requiredSkills: jobRow.required_skills ? JSON.parse(jobRow.required_skills) : [],
      bonusSkills: jobRow.bonus_skills ? JSON.parse(jobRow.bonus_skills) : [],
    });

    const result = await this.aiService.scoreCandidate(candidateJson, jobJson);

    db.prepare(
      `UPDATE candidates SET overall_score = ?, skill_score = ?, experience_score = ?, education_score = ?, ai_comment = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(result.overallScore, result.skillScore, result.experienceScore, result.educationScore, result.aiComment, id);

    return this.candidateService.findOne(id);
  }
}
