import { getSqlite } from './connection';
import { randomUUID } from 'crypto';

export function seedDefaultJob() {
  const sqlite = getSqlite();
  const row = sqlite.prepare('SELECT COUNT(*) as count FROM job_descriptions').get() as { count: number };
  if (row.count === 0) {
    const id = randomUUID();
    sqlite.prepare(
      `INSERT INTO job_descriptions (id, title, description, required_skills, bonus_skills) VALUES (?, ?, ?, ?, ?)`
    ).run(
      id,
      '软件工程师',
      '负责全栈开发，参与系统设计和代码实现，保障产品质量和团队协作。',
      JSON.stringify(['JavaScript', 'TypeScript', 'React', 'Node.js']),
      JSON.stringify(['Python', 'Docker', 'Kubernetes'])
    );
    console.log('Seeded default job description:', id);
  }
}
