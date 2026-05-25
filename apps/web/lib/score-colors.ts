export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-blue-600"
  if (score >= 40) return "text-amber-600"
  return "text-red-600"
}

export function getScoreStroke(score: number): string {
  if (score >= 80) return "text-green-500"
  if (score >= 60) return "text-blue-500"
  if (score >= 40) return "text-amber-500"
  return "text-red-500"
}
