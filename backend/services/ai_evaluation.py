"""
AI rubric matching + persistence (Portfolio, RubricScoreHistory, SkillEvaluation, AIEvaluatedSkill).

Criteria rows come from CriteriaHistory (snapshot). One AIEvaluatedSkill per RubricSkillHistory.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from sqlalchemy.orm import Session, joinedload

import models
from services.rubric_snapshot import (
    apply_time_based_expiry_on_history,
    get_current_evaluable_rubric_history,
)

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
    criteria_history_id: int | None
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


def _group_matches_by_rubric_skill_history(matches: list) -> dict[int, list[dict[str, Any]]]:
    by_skill: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for m in matches:
        if not isinstance(m, dict):
            continue
        sid = _safe_int(m.get("rubric_skill_history_id"))
        if sid is not None:
            by_skill[sid].append(m)
    return by_skill


def _build_ai_rows_per_snapshot_skill(
    *,
    rubric_skill_histories: list[models.RubricSkillHistory],
    matches: list,
    crit_hist_by_id: dict[int, models.CriteriaHistory],
    level_hist_by_id: dict[int, models.LevelHistory],
    skill_evaluation_id: int,
    rubric_history_id: int,
    portfolio_id: int,
) -> tuple[list[models.AIEvaluatedSkill], list[dict[str, Any]]]:
    by_skill = _group_matches_by_rubric_skill_history(matches)
    eval_rows: list[models.AIEvaluatedSkill] = []
    match_extras: list[dict[str, Any]] = []

    for sh in rubric_skill_histories:
        cands = by_skill.get(sh.id, [])
        if not cands:
            eval_rows.append(
                models.AIEvaluatedSkill(
                    skill_evaluation_id=skill_evaluation_id,
                    rubric_score_history_id=rubric_history_id,
                    portfolio_id=portfolio_id,
                    criteria_passing_description=None,
                    skill_name=sh.name,
                    level_rank=0,
                )
            )
            match_extras.append(
                {
                    "criteria_history_id": None,
                    "confidence": None,
                    "matched_from": None,
                }
            )
            continue

        best = max(cands, key=lambda m: _safe_float(m.get("confidence")) or 0.0)
        ch_id = _safe_int(best.get("criteria_history_id"))
        crit = crit_hist_by_id.get(ch_id) if ch_id is not None else None
        level_rank = 0
        desc: str | None = best.get("matched_text")
        criteria_history_out = ch_id

        if crit is not None:
            if crit.level_history:
                level_rank = crit.level_history.rank or 0
            if not desc:
                desc = crit.description
        else:
            lid = _safe_int(best.get("level_history_id"))
            if lid is not None and lid in level_hist_by_id:
                level_rank = level_hist_by_id[lid].rank or 0
            if not desc:
                desc = None

        eval_rows.append(
            models.AIEvaluatedSkill(
                skill_evaluation_id=skill_evaluation_id,
                rubric_score_history_id=rubric_history_id,
                portfolio_id=portfolio_id,
                criteria_passing_description=desc,
                skill_name=sh.name,
                level_rank=level_rank,
            )
        )
        match_extras.append(
            {
                "criteria_history_id": criteria_history_out,
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

    now = datetime.utcnow()

    if skill_evaluation_id is None:
        rubric_history = get_current_evaluable_rubric_history(db, rubric_id, now)
        if not rubric_history:
            raise ValueError(
                f"No active rubric snapshot for rubric_id {rubric_id}. "
                "Create or update the rubric to generate one."
            )

        db_portfolio = models.Portfolio(
            filename=filename or "text_portfolio",
            classification_json=_default_classification(),
            created_at=now,
        )
        db.add(db_portfolio)
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

        if filename:
            db_portfolio.filename = filename

        prev_hist = skill_evaluation.rubric_score_history
        if prev_hist is None:
            raise ValueError("rubric_score_history missing for skill_evaluation")

        if prev_hist.rubric_score_id != rubric_id:
            rubric_history = get_current_evaluable_rubric_history(db, rubric_id, now)
            if not rubric_history:
                raise ValueError(
                    f"No active rubric snapshot for rubric_id {rubric_id}."
                )
            skill_evaluation.rubric_score_history_id = rubric_history.id
            db.flush()
        else:
            rubric_history = prev_hist

        apply_time_based_expiry_on_history(db, rubric_history, now)
        if rubric_history.status == "expired":
            raise ValueError(
                "This skill evaluation is tied to an expired rubric snapshot; "
                "start a new evaluation or switch rubric_id to an active version."
            )

        db.query(models.AIEvaluatedSkill).filter(
            models.AIEvaluatedSkill.skill_evaluation_id == skill_evaluation.id
        ).delete(synchronize_session=False)
        db.flush()

    rubric_history_id = rubric_history.id

    rubric_skill_histories = (
        db.query(models.RubricSkillHistory)
        .filter(models.RubricSkillHistory.rubric_history_id == rubric_history_id)
        .order_by(
            models.RubricSkillHistory.display_order,
            models.RubricSkillHistory.id,
        )
        .all()
    )
    if not rubric_skill_histories:
        raise ValueError(
            f"rubric snapshot {rubric_history_id} has no skills; add skills before evaluation."
        )

    criteria_rows = (
        db.query(models.CriteriaHistory)
        .options(
            joinedload(models.CriteriaHistory.level_history),
        )
        .join(
            models.RubricSkillHistory,
            models.CriteriaHistory.rubric_skill_history_id
            == models.RubricSkillHistory.id,
        )
        .filter(models.RubricSkillHistory.rubric_history_id == rubric_history_id)
        .all()
    )

    criteria_payload = [
        {
            "criteria_history_id": c.id,
            "rubric_skill_history_id": c.rubric_skill_history_id,
            "level_history_id": c.level_history_id,
            "description": c.description,
        }
        for c in criteria_rows
        if c.description
    ]

    if not criteria_payload:
        raise ValueError(
            f"rubric snapshot {rubric_history_id} has no criteria with descriptions to match against"
        )

    match_result = await openai_service.match_text_to_criteria(
        text=text, classification={}, criteria=criteria_payload
    )
    classification, matches = _normalize_match_result(match_result)

    db_portfolio.classification_json = classification
    db.flush()

    crit_hist_by_id = {c.id: c for c in criteria_rows}
    level_hist_ids = {c.level_history_id for c in criteria_rows if c.level_history_id}
    level_hist_rows = (
        db.query(models.LevelHistory)
        .filter(models.LevelHistory.id.in_(level_hist_ids))
        .all()
        if level_hist_ids
        else []
    )
    level_hist_by_id = {lv.id: lv for lv in level_hist_rows}

    eval_rows, match_extras = _build_ai_rows_per_snapshot_skill(
        rubric_skill_histories=rubric_skill_histories,
        matches=matches,
        crit_hist_by_id=crit_hist_by_id,
        level_hist_by_id=level_hist_by_id,
        skill_evaluation_id=skill_evaluation.id,
        rubric_history_id=rubric_history_id,
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
                criteria_history_id=extra["criteria_history_id"],
                confidence=extra["confidence"],
                matched_from=extra["matched_from"],
            )
        )

    return PortfolioAIEvaluationResult(
        portfolio_id=db_portfolio.id,
        skill_evaluation_id=skill_evaluation.id,
        rubric_score_history_id=rubric_history_id,
        classification=classification,
        evaluations=persisted,
    )
