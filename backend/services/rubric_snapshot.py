"""
Snapshot live RubricScore → RubricScoreHistory + *History tree.

Triggers (caller): POST/PUT RubricScore. Closes prior active histories on rubric update.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

import models


def apply_time_based_expiry_on_history(
    db: Session, row: models.RubricScoreHistory, now: datetime | None = None
) -> None:
    """If expired_at has passed, set history status to expired and sync SkillEvaluation."""
    now = now or datetime.utcnow()
    if row.expired_at is None:
        return
    if row.expired_at <= now and row.status != "expired":
        row.status = "expired"
        db.query(models.SkillEvaluation).filter(
            models.SkillEvaluation.rubric_score_history_id == row.id
        ).update({models.SkillEvaluation.status: "expired"}, synchronize_session=False)


def close_active_histories_for_rubric(
    db: Session, rubric_score_id: int, now: datetime | None = None
) -> list[int]:
    """
    Mark current active history rows as superseded: expired_at = now, status = outdated.
    Returns ids of rows that were closed.
    """
    now = now or datetime.utcnow()
    rows = (
        db.query(models.RubricScoreHistory)
        .filter(
            models.RubricScoreHistory.rubric_score_id == rubric_score_id,
            models.RubricScoreHistory.expired_at.is_(None),
            models.RubricScoreHistory.status == "valid",
        )
        .all()
    )
    closed_ids: list[int] = []
    for h in rows:
        h.expired_at = now
        h.status = "outdated"
        closed_ids.append(h.id)
        db.query(models.SkillEvaluation).filter(
            models.SkillEvaluation.rubric_score_history_id == h.id
        ).update({models.SkillEvaluation.status: "outdated"}, synchronize_session=False)
    return closed_ids


def snapshot_live_rubric_to_history(
    db: Session, rubric_score_id: int, now: datetime | None = None
) -> models.RubricScoreHistory:
    """
    Create a new RubricScoreHistory row and copy RubricSkill, Level, Criteria into *History.
    Does not commit.
    """
    now = now or datetime.utcnow()
    rubric = (
        db.query(models.RubricScore)
        .filter(models.RubricScore.id == rubric_score_id)
        .first()
    )
    if not rubric:
        raise ValueError(f"rubric_id {rubric_score_id} does not exist")

    rh = models.RubricScoreHistory(
        created_at=now,
        status="valid",
        expired_at=None,
        rubric_score_id=rubric_score_id,
    )
    db.add(rh)
    db.flush()

    skills = (
        db.query(models.RubricSkill)
        .filter(models.RubricSkill.rubric_id == rubric_score_id)
        .order_by(models.RubricSkill.display_order, models.RubricSkill.id)
        .all()
    )
    skill_map: dict[int, int] = {}
    for s in skills:
        sh = models.RubricSkillHistory(
            rubric_history_id=rh.id,
            name=s.name,
            display_order=s.display_order,
            created_at=now,
        )
        db.add(sh)
        db.flush()
        skill_map[s.id] = sh.id
        
    levels = (
        db.query(models.Level)
        .filter(models.Level.rubric_id == rubric_score_id)
        .order_by(models.Level.rank, models.Level.id)
        .all()
    )
    level_map: dict[int, int] = {}
    for lv in levels:
        lh = models.LevelHistory(
            rubric_history_id=rh.id,
            rank=lv.rank,
            description=lv.description,
            created_at=now,
        )
        db.add(lh)
        db.flush()
        level_map[lv.id] = lh.id

    criteria_rows = (
        db.query(models.Criteria)
        .join(models.RubricSkill, models.Criteria.rubric_skill_id == models.RubricSkill.id)
        .filter(models.RubricSkill.rubric_id == rubric_score_id)
        .all()
    )
    for c in criteria_rows:
        sh_id = skill_map.get(c.rubric_skill_id)
        lh_id = level_map.get(c.level_id)
        if sh_id is None or lh_id is None:
            continue
        ch = models.CriteriaHistory(
            rubric_skill_history_id=sh_id,
            level_history_id=lh_id,
            description=c.description,
            created_at=now,
        )
        db.add(ch)

    db.flush()
    return rh


def get_current_evaluable_rubric_history(
    db: Session, rubric_score_id: int, now: datetime | None = None
) -> models.RubricScoreHistory | None:
    """
    Latest history row for this rubric that is still valid for evaluation:
    status == 'valid' and (expired_at is None or expired_at > now).
    Applies time-based expiry on candidate rows encountered.
    """
    now = now or datetime.utcnow()
    rows = (
        db.query(models.RubricScoreHistory)
        .filter(models.RubricScoreHistory.rubric_score_id == rubric_score_id)
        .order_by(models.RubricScoreHistory.id.desc())
        .all()
    )
    for h in rows:
        apply_time_based_expiry_on_history(db, h, now)
    db.flush()

    for h in rows:
        if h.status == "valid" and (h.expired_at is None or h.expired_at > now):
            return h
    return None
