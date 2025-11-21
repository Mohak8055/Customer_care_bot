from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.database import get_db
from app.models.models import Review, ChatSession, User, Department
from app.schemas.schemas import (
    Review as ReviewSchema,
    ReviewCreate,
    ReviewStats
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("/", response_model=ReviewSchema, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    db: AsyncSession = Depends(get_db)
):
    """Submit a review for a chat session"""
    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )

    # Get chat session
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == review_data.chat_session_id)
    )
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Check if review already exists
    existing_result = await db.execute(
        select(Review).where(Review.chat_session_id == review_data.chat_session_id)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already submitted for this chat session"
        )

    # Create review
    db_review = Review(
        chat_session_id=review_data.chat_session_id,
        rating=review_data.rating,
        comment=review_data.comment,
        customer_name=chat_session.customer_name,
        customer_email=chat_session.customer_email,
        agent_id=chat_session.assigned_agent_id,
        department_id=chat_session.department_id
    )

    db.add(db_review)
    await db.commit()

    # Fetch with relationships
    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.agent),
            selectinload(Review.department)
        )
        .where(Review.id == db_review.id)
    )
    db_review = result.scalar_one_or_none()

    return _review_to_schema(db_review)


@router.get("/", response_model=List[ReviewSchema])
async def get_reviews(
    department_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    min_rating: Optional[int] = None,
    max_rating: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get all reviews with optional filters"""
    query = select(Review).options(
        selectinload(Review.agent),
        selectinload(Review.department)
    )

    if department_id:
        query = query.where(Review.department_id == department_id)
    if agent_id:
        query = query.where(Review.agent_id == agent_id)
    if min_rating:
        query = query.where(Review.rating >= min_rating)
    if max_rating:
        query = query.where(Review.rating <= max_rating)

    query = query.order_by(Review.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    reviews = result.scalars().all()

    return [_review_to_schema(r) for r in reviews]


@router.get("/stats", response_model=ReviewStats)
async def get_review_stats(
    department_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get review statistics"""
    # Base query for filters
    conditions = []
    if department_id:
        conditions.append(Review.department_id == department_id)
    if agent_id:
        conditions.append(Review.agent_id == agent_id)

    # Get total count and average
    count_query = select(func.count(Review.id), func.avg(Review.rating))
    if conditions:
        count_query = count_query.where(and_(*conditions))

    result = await db.execute(count_query)
    row = result.one()
    total_reviews = row[0] or 0
    average_rating = float(row[1]) if row[1] else 0.0

    # Get rating distribution
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    dist_query = select(Review.rating, func.count(Review.id)).group_by(Review.rating)
    if conditions:
        dist_query = dist_query.where(and_(*conditions))

    result = await db.execute(dist_query)
    for rating, count in result.all():
        distribution[rating] = count

    return ReviewStats(
        total_reviews=total_reviews,
        average_rating=round(average_rating, 2),
        rating_distribution=distribution
    )


@router.get("/{review_id}", response_model=ReviewSchema)
async def get_review(
    review_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific review"""
    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.agent),
            selectinload(Review.department)
        )
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    return _review_to_schema(review)


def _review_to_schema(review: Review) -> ReviewSchema:
    """Convert Review model to schema with nested names"""
    return ReviewSchema(
        id=review.id,
        chat_session_id=review.chat_session_id,
        rating=review.rating,
        comment=review.comment,
        customer_name=review.customer_name,
        customer_email=review.customer_email,
        agent_id=review.agent_id,
        agent_name=review.agent.full_name if review.agent else None,
        department_id=review.department_id,
        department_name=review.department.name if review.department else None,
        created_at=review.created_at
    )
