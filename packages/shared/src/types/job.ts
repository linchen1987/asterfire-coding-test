export interface JobDescription {
  id: string;
  title: string;
  description: string | null;
  requiredSkills: string[];
  bonusSkills: string[];
  createdAt: string | null;
  updatedAt: string | null;
}
