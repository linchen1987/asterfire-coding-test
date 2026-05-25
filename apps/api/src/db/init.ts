import { getSqlite } from './connection';

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS job_descriptions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  required_skills TEXT,
  bonus_skills TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  status TEXT,
  raw_text TEXT,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  page_count INTEGER,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  overall_score INTEGER,
  skill_score INTEGER,
  experience_score INTEGER,
  education_score INTEGER,
  ai_comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES job_descriptions(id)
);

CREATE TABLE IF NOT EXISTS educations (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  school TEXT,
  major TEXT,
  degree TEXT,
  graduated_at TEXT,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_experiences (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  company TEXT,
  position TEXT,
  start_date TEXT,
  end_date TEXT,
  summary TEXT,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  name TEXT,
  category TEXT,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  name TEXT,
  tech_stack TEXT,
  responsibilities TEXT,
  highlights TEXT,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);
`;

export function initTables() {
  const sqlite = getSqlite();
  sqlite.exec(CREATE_TABLES_SQL);
}
