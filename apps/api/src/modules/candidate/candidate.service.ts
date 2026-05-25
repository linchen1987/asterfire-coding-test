import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getSqlite } from '../../db/connection';
import { randomUUID } from 'crypto';

const VALID_STATUSES = ['pending', 'screened', 'interviewing', 'hired', 'rejected'];
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['screened', 'rejected'],
  screened: ['interviewing', 'rejected'],
  interviewing: ['hired', 'rejected'],
  hired: [],
  rejected: [],
};

@Injectable()
export class CandidateService {
  private get db() {
    return getSqlite();
  }

  findAll(query: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    jobId?: string;
    sortBy?: string;
    sortOrder?: string;
    skills?: string;
    uploadStatus?: string;
  }) {
    const page = Math.max(1, parseInt(query.page || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10')));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    // Default: only show completed candidates unless uploadStatus is specified
    if (query.uploadStatus) {
      const statuses = query.uploadStatus.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      conditions.push(`c.upload_status IN (${placeholders})`);
      params.push(...statuses);
    } else {
      conditions.push(`c.upload_status = 'completed'`);
    }

    if (query.search) {
      conditions.push(`(c.name LIKE ? OR c.email LIKE ? OR c.city LIKE ?)`);
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }

    if (query.status) {
      conditions.push(`c.status = ?`);
      params.push(query.status);
    }

    if (query.jobId) {
      conditions.push(`c.job_id = ?`);
      params.push(query.jobId);
    }

    if (query.skills) {
      const skillList = query.skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        const placeholders = skillList.map(() => '?').join(',');
        conditions.push(
          `c.id IN (SELECT candidate_id FROM skills WHERE name IN (${placeholders}))`
        );
        params.push(...skillList);
      }
    }

    const allowedSortColumns: Record<string, string> = {
      overallScore: 'c.overall_score',
      createdAt: 'c.created_at',
      name: 'c.name',
    };
    const sortColumn = allowedSortColumns[query.sortBy || ''] || 'c.created_at';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db.prepare(
      `SELECT COUNT(*) as total FROM candidates c ${whereClause}`
    ).get(...params) as { total: number };

    const rows = this.db.prepare(
      `SELECT c.* FROM candidates c ${whereClause} ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset) as any[];

    const candidates: any[] = rows.map(row => this.formatCandidateRow(row));

    for (const c of candidates) {
      c.skills = this.db.prepare('SELECT * FROM skills WHERE candidate_id = ?').all(c.id);
    }

    return {
      items: candidates,
      total: countRow.total,
      page,
      pageSize,
      totalPages: Math.ceil(countRow.total / pageSize),
    };
  }

  findOne(id: string) {
    const row = this.db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
    if (!row) throw new NotFoundException('Candidate not found');

    const candidate: any = this.formatCandidateRow(row);
    candidate.educations = this.db.prepare('SELECT * FROM educations WHERE candidate_id = ?').all(id);
    candidate.workExperiences = this.db.prepare('SELECT * FROM work_experiences WHERE candidate_id = ? ORDER BY start_date DESC').all(id);
    candidate.skills = this.db.prepare('SELECT * FROM skills WHERE candidate_id = ?').all(id);
    candidate.projects = this.db.prepare('SELECT * FROM projects WHERE candidate_id = ?').all(id);

    return candidate;
  }

  update(id: string, data: { name?: string; phone?: string; email?: string; city?: string }) {
    const existing = this.findOne(id);
    const sets: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.phone !== undefined) { sets.push('phone = ?'); params.push(data.phone); }
    if (data.email !== undefined) { sets.push('email = ?'); params.push(data.email); }
    if (data.city !== undefined) { sets.push('city = ?'); params.push(data.city); }

    if (sets.length === 0) return existing;

    sets.push(`updated_at = datetime('now')`);
    params.push(id);

    this.db.prepare(`UPDATE candidates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findOne(id);
  }

  updateStatus(id: string, newStatus: string) {
    const candidate = this.db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
    if (!candidate) throw new NotFoundException('Candidate not found');

    if (candidate.upload_status !== 'completed') {
      throw new BadRequestException('Cannot change status: candidate upload not completed');
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      throw new BadRequestException(`Invalid status: ${newStatus}`);
    }

    const currentStatus = candidate.status;
    if (currentStatus === newStatus) return this.findOne(id);

    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${newStatus}"`
      );
    }

    this.db.prepare(
      `UPDATE candidates SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(newStatus, id);

    return this.findOne(id);
  }

  remove(id: string) {
    const existing = this.findOne(id);
    this.db.prepare('DELETE FROM candidates WHERE id = ?').run(id);
    return existing;
  }

  createWithRawText(data: {
    jobId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    pageCount: number;
    rawText: string;
  }) {
    const id = randomUUID();
    this.db.prepare(
      `INSERT INTO candidates (id, job_id, file_name, file_path, file_size, page_count, raw_text, upload_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL)`
    ).run(id, data.jobId, data.fileName, data.filePath, data.fileSize, data.pageCount, data.rawText);
    return this.findOne(id);
  }

  getUploadStatus(id: string) {
    const row = this.db.prepare('SELECT id, upload_status, raw_text FROM candidates WHERE id = ?').get(id) as any;
    if (!row) throw new NotFoundException('Candidate not found');
    return { uploadStatus: row.upload_status, rawText: row.raw_text };
  }

  saveProfile(id: string, data: {
    basics?: { name?: string; phone?: string; email?: string; city?: string };
    education?: Array<{ school?: string; major?: string; degree?: string; graduatedAt?: string }>;
    workExperience?: Array<{ company?: string; position?: string; startDate?: string; endDate?: string; summary?: string }>;
    skills?: Array<{ name?: string; category?: string }>;
    projects?: Array<{ name?: string; techStack?: string[]; responsibilities?: string; highlights?: string }>;
  }) {
    const candidate = this.db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) as any;
    if (!candidate) throw new NotFoundException('Candidate not found');

    const basics = data.basics || {};
    this.db.prepare(
      `UPDATE candidates SET name = ?, phone = ?, email = ?, city = ?, upload_status = 'completed', status = 'pending', updated_at = datetime('now') WHERE id = ?`
    ).run(basics.name || null, basics.phone || null, basics.email || null, basics.city || null, id);

    this.db.prepare('DELETE FROM educations WHERE candidate_id = ?').run(id);
    if (data.education) {
      for (const edu of data.education) {
        this.db.prepare(
          `INSERT INTO educations (id, candidate_id, school, major, degree, graduated_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(randomUUID(), id, edu.school || null, edu.major || null, edu.degree || null, edu.graduatedAt || null);
      }
    }

    this.db.prepare('DELETE FROM work_experiences WHERE candidate_id = ?').run(id);
    if (data.workExperience) {
      for (const exp of data.workExperience) {
        this.db.prepare(
          `INSERT INTO work_experiences (id, candidate_id, company, position, start_date, end_date, summary) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(randomUUID(), id, exp.company || null, exp.position || null, exp.startDate || null, exp.endDate || null, exp.summary || null);
      }
    }

    this.db.prepare('DELETE FROM skills WHERE candidate_id = ?').run(id);
    if (data.skills) {
      for (const skill of data.skills) {
        this.db.prepare(
          `INSERT INTO skills (id, candidate_id, name, category) VALUES (?, ?, ?, ?)`
        ).run(randomUUID(), id, skill.name || null, skill.category || null);
      }
    }

    this.db.prepare('DELETE FROM projects WHERE candidate_id = ?').run(id);
    if (data.projects) {
      for (const proj of data.projects) {
        this.db.prepare(
          `INSERT INTO projects (id, candidate_id, name, tech_stack, responsibilities, highlights) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          randomUUID(), id, proj.name || null,
          proj.techStack ? JSON.stringify(proj.techStack) : null,
          proj.responsibilities || null, proj.highlights || null,
        );
      }
    }

    return this.findOne(id);
  }

  private formatCandidateRow(row: any) {
    return {
      id: row.id,
      jobId: row.job_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      city: row.city,
      status: row.status,
      rawText: row.raw_text,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      pageCount: row.page_count,
      uploadStatus: row.upload_status,
      overallScore: row.overall_score,
      skillScore: row.skill_score,
      experienceScore: row.experience_score,
      educationScore: row.education_score,
      aiComment: row.ai_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
