"""
AI rubric matching + persistence (Portfolio, RubricScoreHistory, SkillEvaluation, AIEvaluatedSkill).

- One AIEvaluatedSkill row per rubric skill (full rubric coverage), using the best OpenAI match
  per skill when available; otherwise a placeholder row (level_rank=0, no description).
- New run: creates Portfolio + RubricScoreHistory + SkillEvaluation + AI rows.
- Re-upload / refresh: pass skill_evaluation_id to replace AI rows only and update portfolio
  classification (same SkillEvaluation; new RubricScoreHistory if rubric_id changes).
"""
from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from sqlalchemy.orm import Session, joinedload

import models

logger = logging.getLogger(__name__)


class OpenAIMatchProtocol(Protocol):
    async def match_text_to_criteria(
        self, text: str, classification: dict, criteria: list
    ) -> dict | list: ...


@dataclass
class AIEvaluationPersistedRow:
    id: int
    skill_evaluation_id: int
    rubric_score_history_id: int
    portfolio_id: int
    skill_name: str
    level_rank: int
    criteria_passing_description: str | None
    criteria_id: int | None
    confidence: float | None
    matched_from: str | None


@dataclass
class PortfolioAIEvaluationResult:
    portfolio_id: int
    skill_evaluation_id: int
    rubric_score_history_id: int
    classification: dict[str, Any]
    evaluations: list[AIEvaluationPersistedRow]


def _default_classification() -> dict[str, Any]:
    return {"skills": [], "categories": [], "summary": ""}


def _normalize_match_result(match_result: dict | list) -> tuple[dict[str, Any], list]:
    if isinstance(match_result, dict):
        classification = match_result.get("classification") or _default_classification()
        matches = match_result.get("matches") or []
        return classification, matches
    return _default_classification(), match_result


def _safe_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _group_matches_by_rubric_skill(matches: list) -> dict[int, list[dict[str, Any]]]:
    by_skill: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for m in matches:
        if not isinstance(m, dict):
            continue
        sid = _safe_int(m.get("rubric_skill_id"))
        if sid is not None:
            by_skill[sid].append(m)
    return by_skill


def _build_ai_rows_per_rubric_skill(
    *,
    rubric_skills: list[models.RubricSkill],
    matches: list,
    crit_by_id: dict[int, models.Criteria],
    level_by_id: dict[int, models.Level],
    skill_evaluation_id: int,
    rubric_history_id: int,
    portfolio_id: int,
) -> tuple[list[models.AIEvaluatedSkill], list[dict[str, Any]]]:
    """
    One AIEvaluatedSkill per rubric skill. Best match = highest confidence among matches
    for that rubric_skill_id; resolve level via criteria_id or level_id on the match.
    """
    by_skill = _group_matches_by_rubric_skill(matches)
    eval_rows: list[models.AIEvaluatedSkill] = []
    match_extras: list[dict[str, Any]] = []

    for rs in rubric_skills:
        cands = by_skill.get(rs.id, [])
        if not cands:
            eval_rows.append(
                models.AIEvaluatedSkill(
                    skill_evaluation_id=skill_evaluation_id,
                    rubric_score_history_id=rubric_history_id,
                    portfolio_id=portfolio_id,
                    criteria_passing_description=None,
                    skill_name=rs.name,
                    level_rank=0,
                )
            )
            match_extras.append(
                {
                    "criteria_id": None,
                    "confidence": None,
                    "matched_from": None,
                }
            )
            continue

        best = max(cands, key=lambda m: _safe_float(m.get("confidence")) or 0.0)
        crit_id = _safe_int(best.get("criteria_id"))
        crit = crit_by_id.get(crit_id) if crit_id is not None else None
        level_rank = 0
        desc: str | None = best.get("matched_text")
        criteria_id_out = crit_id

        if crit is not None:
            level_rank = crit.level.rank if crit.level else 0
            if not desc:
                desc = crit.description
        else:
            lid = _safe_int(best.get("level_id"))
            if lid is not None and lid in level_by_id:
                level_rank = level_by_id[lid].rank or 0
            if not desc:
                desc = None

        eval_rows.append(
            models.AIEvaluatedSkill(
                skill_evaluation_id=skill_evaluation_id,
                rubric_score_history_id=rubric_history_id,
                portfolio_id=portfolio_id,
                criteria_passing_description=desc,
                skill_name=rs.name,
                level_rank=level_rank,
            )
        )
        match_extras.append(
            {
                "criteria_id": criteria_id_out,
                "confidence": _safe_float(best.get("confidence")),
                "matched_from": best.get("matched_from"),
            }
        )

    return eval_rows, match_extras


async def run_portfolio_ai_evaluation(
    db: Session,
    *,
    text: str,
    rubric_id: int,
    user_id: int,
    filename: str | None,
    openai_service: OpenAIMatchProtocol,
    skill_evaluation_id: int | None = None,
) -> PortfolioAIEvaluationResult:
    if not text.strip():
        raise ValueError("text is required for evaluation")

    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise ValueError(f"rubric_id {rubric_id} does not exist")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError(f"user_id {user_id} does not exist")

    rubric_skills = (
        db.query(models.RubricSkill)
        .filter(models.RubricSkill.rubric_id == rubric_id)
        .order_by(models.RubricSkill.display_order, models.RubricSkill.id)
        .all()
    )
    if not rubric_skills:
        raise ValueError(f"rubric_id {rubric_id} has no rubric skills defined")

    criteria_rows = (
        db.query(models.Criteria)
        .options(
            joinedload(models.Criteria.rubric_skill),
            joinedload(models.Criteria.level),
        )
        .join(models.RubricSkill, models.Criteria.rubric_skill_id == models.RubricSkill.id)
        .filter(models.RubricSkill.rubric_id == rubric_id)
        .all()
    )

    criteria_payload = [
        {
            "criteria_id": c.id,
            "rubric_skill_id": c.rubric_skill_id,
            "level_id": c.level_id,
            "description": c.description,
        }
        for c in criteria_rows
        if c.description
    ]

    if not criteria_payload:
        raise ValueError(
            f"rubric_id {rubric_id} has no criteria with descriptions to match against"
        )

    match_result = await openai_service.match_text_to_criteria(
        text=text, classification={}, criteria=criteria_payload
    )
    classification, matches = _normalize_match_result(match_result)

    crit_by_id = {c.id: c for c in criteria_rows}
    level_ids = {c.level_id for c in criteria_rows if c.level_id}
    levels = (
        db.query(models.Level).filter(models.Level.id.in_(level_ids)).all()
        if level_ids
        else []
    )
    level_by_id = {lv.id: lv for lv in levels}

    now = datetime.utcnow()

    if skill_evaluation_id is None:
        db_portfolio = models.Portfolio(
            filename=filename or "text_portfolio",
            classification_json=classification,
            created_at=now,
        )
        db.add(db_portfolio)
        db.flush()

        rubric_history = models.RubricScoreHistory(
            created_at=now,
            status="valid",
            rubric_score_id=rubric_id,
        )
        db.add(rubric_history)
        db.flush()

        skill_evaluation = models.SkillEvaluation(
            rubric_score_history_id=rubric_history.id,
            portfolio_id=db_portfolio.id,
            user_id=user_id,
            created_at=now,
            status="draft",
        )
        db.add(skill_evaluation)
        db.flush()
    else:
        skill_evaluation = (
            db.query(models.SkillEvaluation)
            .filter(models.SkillEvaluation.id == skill_evaluation_id)
            .first()
        )
        if not skill_evaluation:
            raise ValueError(f"skill_evaluation_id {skill_evaluation_id} not found")
        if skill_evaluation.user_id != user_id:
            raise ValueError("skill_evaluation does not belong to this user_id")

        db_portfolio = (
            db.query(models.Portfolio)
            .filter(models.Portfolio.id == skill_evaluation.portfolio_id)
            .first()
        )
        if not db_portfolio:
            raise ValueError("portfolio for skill_evaluation not found")

        db_portfolio.classification_json = classification
        if filename:
            db_portfolio.filename = filename

        rubric_history = skill_evaluation.rubric_score_history
        if rubric_history is None:
            raise ValueError("rubric_score_history missing for skill_evaluation")
        if rubric_history.rubric_score_id != rubric_id:
            rubric_history = models.RubricScoreHistory(
                created_at=now,
                status="valid",
                rubric_score_id=rubric_id,
            )
            db.add(rubric_history)
            db.flush()
            skill_evaluation.rubric_score_history_id = rubric_history.id

        db.query(models.AIEvaluatedSkill).filter(
            models.AIEvaluatedSkill.skill_evaluation_id == skill_evaluation.id
        ).delete(synchronize_session=False)
        db.flush()

    eval_rows, match_extras = _build_ai_rows_per_rubric_skill(
        rubric_skills=rubric_skills,
        matches=matches,
        crit_by_id=crit_by_id,
        level_by_id=level_by_id,
        skill_evaluation_id=skill_evaluation.id,
        rubric_history_id=rubric_history.id,
        portfolio_id=db_portfolio.id,
    )

    try:
        for row in eval_rows:
            db.add(row)
        db.commit()
    except Exception:
        db.rollback()
        raise

    for row in eval_rows:
        db.refresh(row)

    persisted: list[AIEvaluationPersistedRow] = []
    for row, extra in zip(eval_rows, match_extras, strict=True):
        persisted.append(
            AIEvaluationPersistedRow(
                id=row.id,
                skill_evaluation_id=row.skill_evaluation_id,
                rubric_score_history_id=row.rubric_score_history_id,
                portfolio_id=row.portfolio_id,
                skill_name=row.skill_name or "",
                level_rank=row.level_rank or 0,
                criteria_passing_description=row.criteria_passing_description,
                criteria_id=extra["criteria_id"],
                confidence=extra["confidence"],
                matched_from=extra["matched_from"],
            )
        )

    return PortfolioAIEvaluationResult(
        portfolio_id=db_portfolio.id,
        skill_evaluation_id=skill_evaluation.id,
        rubric_score_history_id=rubric_history.id,
        classification=classification,
        evaluations=persisted,
    )
