import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

export interface StreamChunk {
  type: 'thinking' | 'content' | 'done';
  content?: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: process.env.AI_API_BASE,
      apiKey: process.env.AI_API_KEY,
    });
  }

  async *extractInfoStream(rawText: string): AsyncGenerator<StreamChunk> {
    const model = process.env.AI_MODEL || 'gpt-4o';

    const stream = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的简历信息提取助手。请从简历文本中提取结构化信息，以 JSON 格式返回。如果某个字段无法提取，请返回 null。`,
        },
        {
          role: 'user',
          content: `请从以下简历文本中提取信息:
---
${rawText}
---

请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记）:
{
  "basics": { "name": "", "phone": "", "email": "", "city": "" },
  "education": [{ "school": "", "major": "", "degree": "", "graduatedAt": "" }],
  "workExperience": [{ "company": "", "position": "", "startDate": "", "endDate": "", "summary": "" }],
  "skills": [{ "name": "", "category": "language|framework|tool|platform|other" }],
  "projects": [{ "name": "", "techStack": [], "responsibilities": "", "highlights": "" }]
}`,
        },
      ],
      temperature: 0.1,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if ((delta as any).reasoning_content) {
        yield { type: 'thinking', content: (delta as any).reasoning_content };
      }

      if (delta.content) {
        yield { type: 'content', content: delta.content };
      }
    }

    yield { type: 'done' };
  }

  async scoreCandidate(candidateJson: string, jobJson: string) {
    const model = process.env.AI_MODEL || 'gpt-4o';

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的招聘匹配分析师。请根据候选人信息和岗位需求进行匹配度评分。只返回 JSON，不要包含 markdown 代码块标记。`,
        },
        {
          role: 'user',
          content: `候选人信息:
${candidateJson}

岗位需求:
${jobJson}

请评分并返回 JSON:
{
  "overallScore": 0-100,
  "skillScore": 0-100,
  "experienceScore": 0-100,
  "educationScore": 0-100,
  "aiComment": "200字以内的评语，说明优势与不足"
}`,
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '';
    return this.parseJson(content);
  }

  private parseJson(text: string): any {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(cleaned);
  }
}
