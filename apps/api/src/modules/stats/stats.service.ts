import { Injectable } from '@nestjs/common';
import { getSqlite } from '../../db/connection';

@Injectable()
export class StatsService {
  private get db() {
    return getSqlite();
  }

  getOverview() {
    const db = this.db;

    const totalCandidates = (db.prepare('SELECT COUNT(*) as c FROM candidates WHERE upload_status = ?').get('completed') as any).c;
    const totalJobs = (db.prepare('SELECT COUNT(*) as c FROM job_descriptions').get() as any).c;

    const pendingCount = (db.prepare("SELECT COUNT(*) as c FROM candidates WHERE upload_status = 'completed' AND status = 'pending'").get() as any).c;
    const screenedCount = (db.prepare("SELECT COUNT(*) as c FROM candidates WHERE upload_status = 'completed' AND status = 'screened'").get() as any).c;
    const interviewingCount = (db.prepare("SELECT COUNT(*) as c FROM candidates WHERE upload_status = 'completed' AND status = 'interviewing'").get() as any).c;
    const hiredCount = (db.prepare("SELECT COUNT(*) as c FROM candidates WHERE upload_status = 'completed' AND status = 'hired'").get() as any).c;
    const rejectedCount = (db.prepare("SELECT COUNT(*) as c FROM candidates WHERE upload_status = 'completed' AND status = 'rejected'").get() as any).c;

    const avgScoreRow = db.prepare(
      "SELECT AVG(overall_score) as avg FROM candidates WHERE upload_status = 'completed' AND overall_score IS NOT NULL"
    ).get() as any;

    const jobStats = db.prepare(`
      SELECT j.id, j.title,
        COUNT(c.id) as candidateCount,
        AVG(c.overall_score) as avgScore
      FROM job_descriptions j
      LEFT JOIN candidates c ON j.id = c.job_id AND c.upload_status = 'completed'
      GROUP BY j.id
      ORDER BY candidateCount DESC
    `).all() as any[];

    const recentUploads = db.prepare(`
      SELECT id, name, file_name, job_id, upload_status, status, overall_score, created_at
      FROM candidates
      WHERE upload_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 5
    `).all() as any[];

    return {
      totalCandidates,
      totalJobs,
      statusCounts: {
        pending: pendingCount,
        screened: screenedCount,
        interviewing: interviewingCount,
        hired: hiredCount,
        rejected: rejectedCount,
      },
      avgScore: avgScoreRow?.avg ? Math.round(avgScoreRow.avg) : null,
      jobStats: jobStats.map(j => ({
        id: j.id,
        title: j.title,
        candidateCount: j.candidateCount,
        avgScore: j.avgScore ? Math.round(j.avgScore) : null,
      })),
      recentUploads: recentUploads.map(r => ({
        id: r.id,
        name: r.name,
        fileName: r.file_name,
        jobId: r.job_id,
        uploadStatus: r.upload_status,
        status: r.status,
        overallScore: r.overall_score,
        createdAt: r.created_at,
      })),
    };
  }
}
