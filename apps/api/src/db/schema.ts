import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull(),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  status: text('status'),
  rawText: text('raw_text'),
  fileName: text('file_name'),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  pageCount: integer('page_count'),
  uploadStatus: text('upload_status').notNull().default('pending'),
  overallScore: integer('overall_score'),
  skillScore: integer('skill_score'),
  experienceScore: integer('experience_score'),
  educationScore: integer('education_score'),
  aiComment: text('ai_comment'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const educations = sqliteTable('educations', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull(),
  school: text('school'),
  major: text('major'),
  degree: text('degree'),
  graduatedAt: text('graduated_at'),
});

export const workExperiences = sqliteTable('work_experiences', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull(),
  company: text('company'),
  position: text('position'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  summary: text('summary'),
});

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull(),
  name: text('name'),
  category: text('category'),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull(),
  name: text('name'),
  techStack: text('tech_stack'),
  responsibilities: text('responsibilities'),
  highlights: text('highlights'),
});

export const jobDescriptions = sqliteTable('job_descriptions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  requiredSkills: text('required_skills'),
  bonusSkills: text('bonus_skills'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});
