import logging
import base64
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session, joinedload

import models
from api.deps import db_dependency
from schemas import (
    AIEvaluatedSkillModel,
    AIEvaluatedSkillPlaceholderCreate,
    AIEvaluatedSkillPlaceholderUpdate,
    AIEvaluationItemResponse,
    PortfolioModel,
    PortfolioEvaluateRequest,
    PortfolioEvaluateResponse,
    SkillEvaluationCreate,
    SkillEvaluationFullModel,
    SkillEvaluationModel,
    SkillEvaluationUpdate,
    StudentEvaluatedSkillBase,
    StudentEvaluatedSkillModel,
    TeacherEvaluatedSkillBase,
    TeacherEvaluatedSkillModel,
)
from services.openai_service import get_openai_service
from services.ai_evaluation import run_portfolio_ai_evaluation, PortfolioAIEvaluationResult
from services.rubric_snapshot import apply_time_based_expiry_on_history

logger = logging.getLogger(__name__)

# Manual CRUD for ai_evaluated_skill uses teacher-shaped bodies until AI owns criteria text.
AI_EVALUATED_SKILL_CRITERIA_PLACEHOLDER = (
    "[placeholder] Row created with teacher_evaluated_skill-shaped input; "
    "replace when AI pipeline supplies criteria_passing_description."
)

router = APIRouter(tags=["Evaluation"])


def _apply_time_based_expiry_for_evaluations(
    db: Session, evaluations: list[models.SkillEvaluation]
) -> None:
    """Persist rubric snapshot + SkillEvaluation expiry for histories tied to these rows."""
    if not evaluations:
        return
    now = datetime.utcnow()
    history_ids = {
        e.rubric_score_history_id for e in evaluations if e.rubric_score_history_id is not None
    }
    for hid in history_ids:
        h = (
            db.query(models.RubricScoreHistory)
            .filter(models.RubricScoreHistory.id == hid)
            .first()
        )
        if h:
            apply_time_based_expiry_on_history(db, h, now)
    if history_ids:
        db.commit()
        for e in evaluations:
            db.refresh(e)


@router.post("/portfolio/import")
async def extract_document(file: UploadFile = File(...)):
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a PDF file (.pdf)",
            )

        openai_service = get_openai_service()
        extracted = await openai_service.extract_text_from_pdf(file)

        text = extracted["text"]
        logger.info("Extracted text: %s...", text[:100])
        metadata = extracted["metadata"]
        await file.seek(0)
        file_bytes = await file.read()
        # Store payload in DB later via ai_evaluation/run request body.
        # Keep field name "file_token" for frontend compatibility.
        file_token = base64.b64encode(file_bytes).decode("ascii")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "metadata": metadata,
                "text": text,
                "file_token": file_token,
                "original_filename": file.filename,
            },
        )
    except ValueError as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error extracting PDF text: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract text from PDF: {str(e)}",
        ) from e


@router.get("/portfolio/{portfolio_id}", response_model=PortfolioModel)
async def read_portfolio(portfolio_id: int, db: db_dependency):
    row = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"portfolio_id {portfolio_id} not found")
    return row


@router.get("/portfolio/{portfolio_id}/file")
async def read_portfolio_file(portfolio_id: int, db: db_dependency):
    row = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"portfolio_id {portfolio_id} not found")

    classification = row.classification_json if isinstance(row.classification_json, dict) else {}
    file_blob_b64 = classification.get("__file_token")
    if not isinstance(file_blob_b64, str) or not file_blob_b64.strip():
        raise HTTPException(status_code=404, detail="portfolio file is not stored")
    try:
        file_bytes = base64.b64decode(file_blob_b64, validate=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail="stored portfolio file is corrupted") from e

    download_name = row.filename or "portfolio.pdf"
    if not download_name.lower().endswith(".pdf"):
        download_name = f"{download_name}.pdf"
    # Starlette encodes header values as latin-1; use RFC 5987 filename* for unicode names.
    latin1_fallback_name = download_name.encode("latin-1", errors="replace").decode("latin-1")
    encoded_utf8_name = quote(download_name, safe="")
    return Response(
        content=file_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="{latin1_fallback_name}"; '
                f"filename*=UTF-8''{encoded_utf8_name}"
            )
        },
    )


def _portfolio_evaluate_response_from_result(
    result: PortfolioAIEvaluationResult,
) -> PortfolioEvaluateResponse:
    return PortfolioEvaluateResponse(
        success=True,
        portfolio_id=result.portfolio_id,
        skill_evaluation_id=result.skill_evaluation_id,
        rubric_score_history_id=result.rubric_score_history_id,
        classification=result.classification,
        evaluations=[
            AIEvaluationItemResponse(
                id=e.id,
                skill_evaluation_id=e.skill_evaluation_id,
                rubric_score_history_id=e.rubric_score_history_id,
                portfolio_id=e.portfolio_id,
                skill_name=e.skill_name,
                level_rank=e.level_rank,
                criteria_passing_description=e.criteria_passing_description,
                criteria_history_id=e.criteria_history_id,
                criteria_id=e.criteria_history_id,
                confidence=e.confidence,
                matched_from=e.matched_from,
            )
            for e in result.evaluations
        ],
    )


@router.post("/portfolio/evaluate", response_model=PortfolioEvaluateResponse)
async def evaluate_and_save(
    text: str,
    rubric_id: int,
    user_id: int,
    db: db_dependency,
    filename: str | None = None,
    skill_evaluation_id: int | None = None,
):
    try:
        openai_service = get_openai_service()
        result = await run_portfolio_ai_evaluation(
            db,
            text=text,
            rubric_id=rubric_id,
            user_id=user_id,
            filename=filename,
            file_token=None,
            openai_service=openai_service,
            skill_evaluation_id=skill_evaluation_id,
        )
        return _portfolio_evaluate_response_from_result(result)
    except ValueError as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error during evaluation: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Failed to evaluate and save: {str(e)}"
        ) from e


@router.post("/ai_evaluation/run", response_model=PortfolioEvaluateResponse)
async def ai_evaluation_run(body: PortfolioEvaluateRequest, db: db_dependency):
    try:
        openai_service = get_openai_service()
        result = await run_portfolio_ai_evaluation(
            db,
            text=body.text,
            rubric_id=body.rubric_id,
            user_id=body.user_id,
            filename=body.filename,
            file_token=body.file_token,
            openai_service=openai_service,
            skill_evaluation_id=body.skill_evaluation_id,
        )
        return _portfolio_evaluate_response_from_result(result)
    except ValueError as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error during AI evaluation: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Failed to evaluate and save: {str(e)}"
        ) from e


def _get_skill_evaluation_or_404(
    db: Session, skill_evaluation_id: int
) -> models.SkillEvaluation:
    se = (
        db.query(models.SkillEvaluation)
        .filter(models.SkillEvaluation.id == skill_evaluation_id)
        .first()
    )
    if not se:
        raise HTTPException(
            status_code=404,
            detail=f"skill_evaluation_id {skill_evaluation_id} not found",
        )
    return se


def _list_ai_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: Session
) -> list[models.AIEvaluatedSkill]:
    _get_skill_evaluation_or_404(db, skill_evaluation_id)
    return (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.skill_evaluation_id == skill_evaluation_id)
        .all()
    )


@router.get(
    "/skill_evaluation/{skill_evaluation_id}/ai_evaluations",
    response_model=list[AIEvaluatedSkillModel],
)
async def list_ai_evaluations_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    return _list_ai_evaluated_skills_for_skill_evaluation(skill_evaluation_id, db)


@router.get(
    "/skill_evaluation/{skill_evaluation_id}/ai_evaluated_skills",
    response_model=list[AIEvaluatedSkillModel],
)
async def list_ai_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    return _list_ai_evaluated_skills_for_skill_evaluation(skill_evaluation_id, db)


@router.get("/ai_evaluation/{ai_evaluated_skill_id}", response_model=AIEvaluatedSkillModel)
async def get_ai_evaluation(ai_evaluated_skill_id: int, db: db_dependency):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    return row


@router.post("/skill_evaluation/", response_model=SkillEvaluationModel)
async def create_skill_evaluation(body: SkillEvaluationCreate, db: db_dependency):
    if not (
        db.query(models.RubricScoreHistory)
        .filter(models.RubricScoreHistory.id == body.rubric_score_history_id)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail=f"rubric_score_history_id {body.rubric_score_history_id} does not exist",
        )
    if not db.query(models.Portfolio).filter(models.Portfolio.id == body.portfolio_id).first():
        raise HTTPException(
            status_code=400, detail=f"portfolio_id {body.portfolio_id} does not exist"
        )
    if not db.query(models.User).filter(models.User.id == body.user_id).first():
        raise HTTPException(
            status_code=400, detail=f"user_id {body.user_id} does not exist"
        )
    now = datetime.utcnow()
    row = models.SkillEvaluation(
        rubric_score_history_id=body.rubric_score_history_id,
        portfolio_id=body.portfolio_id,
        user_id=body.user_id,
        created_at=body.created_at or now,
        status=body.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/skill_evaluation/", response_model=List[SkillEvaluationModel])
async def list_skill_evaluations(
    db: db_dependency,
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    portfolio_id: Optional[int] = None,
):
    q = db.query(models.SkillEvaluation)
    if user_id is not None:
        q = q.filter(models.SkillEvaluation.user_id == user_id)
    if portfolio_id is not None:
        q = q.filter(models.SkillEvaluation.portfolio_id == portfolio_id)
    # Defensive: avoid FastAPI response validation errors for legacy rows with NULL rubric snapshots.
    q = q.filter(models.SkillEvaluation.rubric_score_history_id.isnot(None))
    rows = q.order_by(models.SkillEvaluation.id.desc()).offset(skip).limit(limit).all()
    _apply_time_based_expiry_for_evaluations(db, rows)
    return rows


@router.get(
    "/skill_evaluation/{skill_evaluation_id}/full",
    response_model=SkillEvaluationFullModel,
)
async def read_skill_evaluation_full(
    skill_evaluation_id: int, db: db_dependency
):
    se = (
        db.query(models.SkillEvaluation)
        .options(
            joinedload(models.SkillEvaluation.ai_evaluated_skills),
            joinedload(models.SkillEvaluation.student_evaluated_skills),
            joinedload(models.SkillEvaluation.teacher_evaluated_skills),
        )
        .filter(models.SkillEvaluation.id == skill_evaluation_id)
        .first()
    )
    if not se:
        raise HTTPException(
            status_code=404,
            detail=f"skill_evaluation_id {skill_evaluation_id} not found",
        )
    # Defensive: schema requires `rubric_score_history_id` to be an int.
    if se.rubric_score_history_id is None:
        raise HTTPException(
            status_code=500,
            detail=f"skill_evaluation_id {skill_evaluation_id} has no rubric_score_history_id",
        )
    _apply_time_based_expiry_for_evaluations(db, [se])
    return SkillEvaluationFullModel(
        id=se.id,
        rubric_score_history_id=se.rubric_score_history_id,
        portfolio_id=se.portfolio_id,
        user_id=se.user_id,
        created_at=se.created_at,
        status=se.status,
        ai_evaluated_skills=[AIEvaluatedSkillModel.model_validate(x) for x in se.ai_evaluated_skills],
        student_evaluated_skills=[
            StudentEvaluatedSkillModel.model_validate(x) for x in se.student_evaluated_skills
        ],
        teacher_evaluated_skills=[
            TeacherEvaluatedSkillModel.model_validate(x) for x in se.teacher_evaluated_skills
        ],
    )


@router.get("/skill_evaluation/{skill_evaluation_id}", response_model=SkillEvaluationModel)
async def read_skill_evaluation(skill_evaluation_id: int, db: db_dependency):
    se = _get_skill_evaluation_or_404(db, skill_evaluation_id)
    # Defensive: schema requires `rubric_score_history_id` to be an int.
    if se.rubric_score_history_id is None:
        raise HTTPException(
            status_code=500,
            detail=f"skill_evaluation_id {skill_evaluation_id} has no rubric_score_history_id",
        )
    _apply_time_based_expiry_for_evaluations(db, [se])
    return se


@router.put("/skill_evaluation/{skill_evaluation_id}", response_model=SkillEvaluationModel)
async def update_skill_evaluation(
    skill_evaluation_id: int, body: SkillEvaluationUpdate, db: db_dependency
):
    row = _get_skill_evaluation_or_404(db, skill_evaluation_id)
    data = body.model_dump(exclude_unset=True)
    if "rubric_score_history_id" in data:
        rid = data["rubric_score_history_id"]
        if rid is not None and not (
            db.query(models.RubricScoreHistory)
            .filter(models.RubricScoreHistory.id == rid)
            .first()
        ):
            raise HTTPException(
                status_code=400, detail=f"rubric_score_history_id {rid} does not exist"
            )
    if "portfolio_id" in data:
        pid = data["portfolio_id"]
        if pid is not None and not (
            db.query(models.Portfolio).filter(models.Portfolio.id == pid).first()
        ):
            raise HTTPException(status_code=400, detail=f"portfolio_id {pid} does not exist")
    if "user_id" in data:
        uid = data["user_id"]
        if uid is not None and not (
            db.query(models.User).filter(models.User.id == uid).first()
        ):
            raise HTTPException(status_code=400, detail=f"user_id {uid} does not exist")
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/skill_evaluation/{skill_evaluation_id}")
async def delete_skill_evaluation(skill_evaluation_id: int, db: db_dependency):
    row = _get_skill_evaluation_or_404(db, skill_evaluation_id)
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"skill_evaluation_id {skill_evaluation_id} deleted"},
    )


@router.post("/student_evaluated_skill/", response_model=StudentEvaluatedSkillModel)
async def create_student_evaluated_skill(
    body: StudentEvaluatedSkillBase, db: db_dependency
):
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    row = models.StudentEvaluatedSkill(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/skill_evaluation/{skill_evaluation_id}/student_evaluated_skills",
    response_model=List[StudentEvaluatedSkillModel],
)
async def list_student_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    _get_skill_evaluation_or_404(db, skill_evaluation_id)
    return (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.skill_evaluation_id == skill_evaluation_id)
        .all()
    )


@router.get(
    "/student_evaluated_skill/{student_evaluated_skill_id}",
    response_model=StudentEvaluatedSkillModel,
)
async def read_student_evaluated_skill(
    student_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.id == student_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"student_evaluated_skill_id {student_evaluated_skill_id} not found",
        )
    return row


@router.put(
    "/student_evaluated_skill/{student_evaluated_skill_id}",
    response_model=StudentEvaluatedSkillModel,
)
async def update_student_evaluated_skill(
    student_evaluated_skill_id: int, body: StudentEvaluatedSkillBase, db: db_dependency
):
    row = (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.id == student_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"student_evaluated_skill_id {student_evaluated_skill_id} not found",
        )
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/student_evaluated_skill/{student_evaluated_skill_id}")
async def delete_student_evaluated_skill(
    student_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.id == student_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"student_evaluated_skill_id {student_evaluated_skill_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"student_evaluated_skill_id {student_evaluated_skill_id} deleted"},
    )


@router.post("/teacher_evaluated_skill/", response_model=TeacherEvaluatedSkillModel)
async def create_teacher_evaluated_skill(
    body: TeacherEvaluatedSkillBase, db: db_dependency
):
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    row = models.TeacherEvaluatedSkill(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/skill_evaluation/{skill_evaluation_id}/teacher_evaluated_skills",
    response_model=List[TeacherEvaluatedSkillModel],
)
async def list_teacher_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    _get_skill_evaluation_or_404(db, skill_evaluation_id)
    return (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.skill_evaluation_id == skill_evaluation_id)
        .all()
    )


@router.get(
    "/teacher_evaluated_skill/{teacher_evaluated_skill_id}",
    response_model=TeacherEvaluatedSkillModel,
)
async def read_teacher_evaluated_skill(
    teacher_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.id == teacher_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} not found",
        )
    return row


@router.put(
    "/teacher_evaluated_skill/{teacher_evaluated_skill_id}",
    response_model=TeacherEvaluatedSkillModel,
)
async def update_teacher_evaluated_skill(
    teacher_evaluated_skill_id: int, body: TeacherEvaluatedSkillBase, db: db_dependency
):
    row = (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.id == teacher_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} not found",
        )
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/teacher_evaluated_skill/{teacher_evaluated_skill_id}")
async def delete_teacher_evaluated_skill(
    teacher_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.id == teacher_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} deleted"},
    )


@router.post("/ai_evaluated_skill/", response_model=AIEvaluatedSkillModel)
async def create_ai_evaluated_skill_placeholder(
    body: AIEvaluatedSkillPlaceholderCreate, db: db_dependency
):
    se = _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    row = models.AIEvaluatedSkill(
        skill_evaluation_id=se.id,
        rubric_score_history_id=se.rubric_score_history_id,
        portfolio_id=se.portfolio_id,
        criteria_passing_description=AI_EVALUATED_SKILL_CRITERIA_PLACEHOLDER,
        skill_name=body.skill_name,
        level_rank=body.level_rank,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/ai_evaluated_skill/{ai_evaluated_skill_id}",
    response_model=AIEvaluatedSkillModel,
)
async def read_ai_evaluated_skill(ai_evaluated_skill_id: int, db: db_dependency):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    return row


@router.put(
    "/ai_evaluated_skill/{ai_evaluated_skill_id}",
    response_model=AIEvaluatedSkillModel,
)
async def update_ai_evaluated_skill_placeholder(
    ai_evaluated_skill_id: int, body: AIEvaluatedSkillPlaceholderUpdate, db: db_dependency
):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    data = body.model_dump(exclude_unset=True)
    if "skill_name" in data:
        row.skill_name = data["skill_name"]
    if "level_rank" in data:
        row.level_rank = data["level_rank"]
    db.commit()
    db.refresh(row)
    return row


@router.delete("/ai_evaluated_skill/{ai_evaluated_skill_id}")
async def delete_ai_evaluated_skill(ai_evaluated_skill_id: int, db: db_dependency):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"ai_evaluated_skill_id {ai_evaluated_skill_id} deleted"},
    )
