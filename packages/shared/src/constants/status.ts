export const CANDIDATE_STATUSES = {
  pending: { label: '待筛选', color: 'neutral' },
  screened: { label: '初筛通过', color: 'blue' },
  interviewing: { label: '面试中', color: 'amber' },
  hired: { label: '已录用', color: 'green' },
  rejected: { label: '已淘汰', color: 'red' },
} as const;

export const UPLOAD_STATUSES = {
  uploading: { label: '上传中', color: 'blue' },
  pending: { label: '待解析', color: 'amber' },
  completed: { label: '已完成', color: 'green' },
  failed: { label: '失败', color: 'red' },
} as const;
