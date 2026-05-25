import {
  Controller,
  Post,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
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
  async score(@Param('id') id: string, @Res() res: Response) {
    const candidate = this.candidateService.findOne(id);

    if (candidate.uploadStatus !== 'completed') {
      throw new BadRequestException('Cannot score: candidate upload not completed');
    }

    const db = getSqlite();
    const jobRow = db.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(candidate.jobId) as any;
    if (!jobRow) throw new NotFoundException('Associated job not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('progress', { step: 'connecting', message: '正在连接 AI 服务...' });

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

      let contentBuffer = '';

      for await (const chunk of this.aiService.scoreCandidateStream(candidateJson, jobJson)) {
        if (chunk.type === 'thinking' && chunk.content) {
          sendEvent('thinking', { delta: chunk.content });
        }

        if (chunk.type === 'content' && chunk.content) {
          contentBuffer += chunk.content;
          sendEvent('partial', { delta: chunk.content });
        }

        if (chunk.type === 'done') {
          sendEvent('progress', { step: 'parsing', message: '正在解析评分结果...' });

          let cleaned = contentBuffer.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }

          const result = JSON.parse(cleaned);

          db.prepare(
            `UPDATE candidates SET overall_score = ?, skill_score = ?, experience_score = ?, education_score = ?, ai_comment = ?, updated_at = datetime('now') WHERE id = ?`
          ).run(result.overallScore, result.skillScore, result.experienceScore, result.educationScore, result.aiComment, id);

          const updated = this.candidateService.findOne(id);
          sendEvent('complete', { candidateId: id, scores: updated });
        }
      }
    } catch (e: any) {
      sendEvent('error', { message: e.message || 'AI scoring failed' });
    }

    res.end();
  }
}
