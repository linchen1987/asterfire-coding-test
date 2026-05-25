"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"

interface ScoreRadarProps {
  skillScore: number
  experienceScore: number
  educationScore: number
  overallScore: number
}

export function ScoreRadar({ skillScore, experienceScore, educationScore, overallScore }: ScoreRadarProps) {
  const data = [
    { dimension: "技能匹配", score: skillScore, fullMark: 100 },
    { dimension: "工作经验", score: experienceScore, fullMark: 100 },
    { dimension: "教育背景", score: educationScore, fullMark: 100 },
    { dimension: "综合评分", score: overallScore, fullMark: 100 },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="评分"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
