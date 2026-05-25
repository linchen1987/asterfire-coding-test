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

const FIELD_ORDER = ['basics', 'education', 'workExperience', 'skills', 'projects'] as const;

const FIELD_LABELS: Record<string, string> = {
  basics: '基本信息',
  education: '教育背景',
  workExperience: '工作经历',
  skills: '技能标签',
  projects: '项目经历',
};

@Controller('ai')
export class ExtractController {
  constructor(
    private readonly aiService: AiService,
    private readonly candidateService: CandidateService,
  ) {}

  @Post('extract/:candidateId')
  async extract(@Param('candidateId') candidateId: string, @Res() res: Response) {
    const candidate = this.candidateService.findOne(candidateId);
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (candidate.uploadStatus !== 'pending' && candidate.uploadStatus !== 'failed') {
      throw new BadRequestException(`Cannot extract: upload_status is ${candidate.uploadStatus}`);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('progress', { step: 'connecting', message: '正在连接 AI 服务...' });

      let buffer = '';
      const emittedFields = new Set<string>();

      for await (const chunk of this.aiService.extractInfoStream(candidate.rawText || '')) {
        if (chunk.type === 'thinking' && chunk.content) {
          sendEvent('thinking', { delta: chunk.content });
        }

        if (chunk.type === 'content' && chunk.content) {
          buffer += chunk.content;
          this.emitNewFields(buffer, emittedFields, sendEvent);
        }

        if (chunk.type === 'done') {
          this.emitFinalFields(buffer, emittedFields, sendEvent);
        }
      }

      sendEvent('complete', { candidateId });
    } catch (e: any) {
      sendEvent('error', { message: e.message || 'AI extraction failed' });
    }

    res.end();
  }

  private emitNewFields(
    buffer: string,
    emittedFields: Set<string>,
    sendEvent: (event: string, data: any) => void,
  ) {
    for (const field of FIELD_ORDER) {
      if (emittedFields.has(field)) continue;
      const parsed = this.tryParseField(buffer, field);
      if (parsed !== undefined) {
        sendEvent('progress', { step: 'generating', message: `正在生成${FIELD_LABELS[field] || field}...` });
        sendEvent('partial', { field, data: parsed });
        emittedFields.add(field);
      }
    }
  }

  private emitFinalFields(
    buffer: string,
    emittedFields: Set<string>,
    sendEvent: (event: string, data: any) => void,
  ) {
    let cleaned = buffer.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const full = JSON.parse(cleaned);
      for (const field of FIELD_ORDER) {
        if (emittedFields.has(field)) continue;
        if (full[field] !== undefined) {
          sendEvent('progress', { step: 'generating', message: `正在生成${FIELD_LABELS[field] || field}...` });
          sendEvent('partial', { field, data: full[field] });
          emittedFields.add(field);
        }
      }
    } catch {}
  }

  private tryParseField(buffer: string, field: string): any | undefined {
    let cleaned = buffer.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const searchStart = cleaned.indexOf(`"${field}"`);
    if (searchStart === -1) return undefined;

    const afterKey = cleaned.slice(searchStart + `"${field}"`.length);
    const colonIdx = afterKey.indexOf(':');
    if (colonIdx === -1) return undefined;

    const afterColon = afterKey.slice(colonIdx + 1).trimStart();
    if (afterColon.length === 0) return undefined;

    const first = afterColon[0];
    if (first !== '{' && first !== '[' && first !== 'n') return undefined;

    if (first === 'n') {
      if (afterColon.startsWith('null')) {
        try { return JSON.parse('null'); } catch { return undefined; }
      }
      return undefined;
    }

    const close = first === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < afterColon.length; i++) {
      const ch = afterColon[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === first) depth++;
      if (ch === close) {
        depth--;
        if (depth === 0) {
          const candidate = afterColon.slice(0, i + 1);
          try { return JSON.parse(candidate); } catch { return undefined; }
        }
      }
    }

    return undefined;
  }
}
