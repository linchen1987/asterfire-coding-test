export type CandidateStatus = 'pending' | 'screened' | 'interviewing' | 'hired' | 'rejected';

export type UploadStatus = 'uploading' | 'pending' | 'completed' | 'failed';

export interface CandidateBasics {
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
}

export interface Education {
  id: string;
  candidateId: string;
  school: string | null;
  major: string | null;
  degree: string | null;
  graduatedAt: string | null;
}

export interface WorkExperience {
  id: string;
  candidateId: string;
  company: string | null;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  summary: string | null;
}

export interface Skill {
  id: string;
  candidateId: string;
  name: string | null;
  category: string | null;
}

export interface Project {
  id: string;
  candidateId: string;
  name: string | null;
  techStack: string | null;
  responsibilities: string | null;
  highlights: string | null;
}

export interface PartialBasics {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
}

export interface PartialEducation {
  school?: string;
  major?: string;
  degree?: string;
  graduatedAt?: string;
}

export interface PartialWorkExperience {
  company?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
}

export interface PartialSkill {
  name: string;
  category?: string;
}

export interface PartialData {
  basics?: PartialBasics;
  education?: PartialEducation[];
  workExperience?: PartialWorkExperience[];
  skills?: PartialSkill[];
  projects?: unknown[];
}

export interface Candidate extends CandidateBasics {
  id: string;
  jobId: string;
  status: CandidateStatus | null;
  rawText: string | null;
  fileName: string | null;
  filePath: string | null;
  fileSize: number | null;
  pageCount: number | null;
  uploadStatus: UploadStatus;
  overallScore: number | null;
  skillScore: number | null;
  experienceScore: number | null;
  educationScore: number | null;
  aiComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  educations?: Education[];
  workExperiences?: WorkExperience[];
  skills?: Skill[];
  projects?: Project[];
}
