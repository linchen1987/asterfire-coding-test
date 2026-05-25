import { Injectable, NotFoundException } from '@nestjs/common';
import { getSqlite } from '../../db/connection';
import { randomUUID } from 'crypto';

@Injectable()
export class JobService {
  private get db() {
    return getSqlite();
  }

  findAll() {
    const rows = this.db.prepare('SELECT * FROM job_descriptions ORDER BY created_at DESC').all();
    return rows.map(this.parseJob);
  }

  findOne(id: string) {
    const row = this.db.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(id);
    if (!row) throw new NotFoundException('Job not found');
    return this.parseJob(row);
  }

  create(data: { title: string; description?: string; requiredSkills?: string[]; bonusSkills?: string[] }) {
    const id = randomUUID();
    this.db.prepare(
      `INSERT INTO job_descriptions (id, title, description, required_skills, bonus_skills) VALUES (?, ?, ?, ?, ?)`
    ).run(
      id,
      data.title,
      data.description || null,
      data.requiredSkills ? JSON.stringify(data.requiredSkills) : null,
      data.bonusSkills ? JSON.stringify(data.bonusSkills) : null,
    );
    return this.findOne(id);
  }

  update(id: string, data: { title?: string; description?: string; requiredSkills?: string[]; bonusSkills?: string[] }) {
    const existing = this.findOne(id);
    const title = data.title ?? existing.title;
    const description = data.description ?? existing.description;
    const requiredSkills = data.requiredSkills ?? existing.requiredSkills;
    const bonusSkills = data.bonusSkills ?? existing.bonusSkills;

    this.db.prepare(
      `UPDATE job_descriptions SET title = ?, description = ?, required_skills = ?, bonus_skills = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      title,
      description,
      requiredSkills ? JSON.stringify(requiredSkills) : null,
      bonusSkills ? JSON.stringify(bonusSkills) : null,
      id,
    );
    return this.findOne(id);
  }

  remove(id: string) {
    const existing = this.findOne(id);
    this.db.prepare('DELETE FROM job_descriptions WHERE id = ?').run(id);
    return existing;
  }

  private parseJob(row: any) {
    return {
      ...row,
      requiredSkills: row.required_skills ? JSON.parse(row.required_skills) : [],
      bonusSkills: row.bonus_skills ? JSON.parse(row.bonus_skills) : [],
      required_skills: undefined,
      bonus_skills: undefined,
    };
  }
}
