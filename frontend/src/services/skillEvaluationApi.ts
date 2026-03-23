import api from '../api/index';

export interface SkillEvaluationRecord {
  id: number;
  rubric_score_history_id: number;
  portfolio_id: number;
  user_id: number;
  created_at?: string;
  status: string;
}

export interface SkillEvaluationUpdatePayload {
  rubric_score_history_id?: number;
  portfolio_id?: number;
  user_id?: number;
  status?: string;
}

export async function getSkillEvaluationsByUser(userId: number): Promise<SkillEvaluationRecord[]> {
  const res = await api.get<SkillEvaluationRecord[]>('skill_evaluation/', {
    params: { user_id: userId },
  });
  return res.data;
}

export async function getSkillEvaluation(id: number): Promise<SkillEvaluationRecord> {
  const res = await api.get<SkillEvaluationRecord>(`skill_evaluation/${id}`);
  return res.data;
}

export async function getSkillEvaluations(params?: {
  user_id?: number;
  portfolio_id?: number;
}): Promise<SkillEvaluationRecord[]> {
  const res = await api.get<SkillEvaluationRecord[]>('skill_evaluation/', {
    params,
  });
  return res.data;
}

export async function updateSkillEvaluation(
  id: number,
  payload: SkillEvaluationUpdatePayload
): Promise<SkillEvaluationRecord> {
  const res = await api.put<SkillEvaluationRecord>(`skill_evaluation/${id}`, payload);
  return res.data;
}

export async function deleteSkillEvaluation(id: number): Promise<void> {
  await api.delete(`skill_evaluation/${id}`);
}
