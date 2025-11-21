from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models.models import User, UserRole, AgentStatus
from app.schemas.schemas import User as UserSchema, UserCreate, UserUpdate, UserWithDepartment
from app.services.auth import get_password_hash

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[UserWithDepartment])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    role: UserRole = None,
    department_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all users with optional filters"""
    query = select(User).options(selectinload(User.department))

    if role:
        query = query.where(User.role == role)
    if department_id:
        query = query.where(User.department_id == department_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return users


@router.get("/agents/available", response_model=List[UserSchema])
async def get_available_agents(
    department_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all available agents"""
    query = select(User).where(
        and_(
            User.role == UserRole.AGENT,
            User.agent_status == AgentStatus.AVAILABLE,
            User.is_active == True
        )
    )

    if department_id:
        query = query.where(User.department_id == department_id)

    result = await db.execute(query)
    agents = result.scalars().all()
    return agents


@router.get("/{user_id}", response_model=UserWithDepartment)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific user by ID"""
    result = await db.execute(
        select(User)
        .options(selectinload(User.department))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new user"""
    # Check if username exists
    result = await db.execute(
        select(User).where(User.username == user.username)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check if email exists
    result = await db.execute(
        select(User).where(User.email == user.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Create user
    user_data = user.model_dump()
    password = user_data.pop("password")
    hashed_password = get_password_hash(password)

    db_user = User(**user_data, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a user"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)

    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.put("/{user_id}/status", response_model=UserSchema)
async def update_agent_status(
    user_id: int,
    agent_status: AgentStatus,
    db: AsyncSession = Depends(get_db)
):
    """Update agent status (available, busy, offline)"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if db_user.role != UserRole.AGENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an agent"
        )

    db_user.agent_status = agent_status
    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a user"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    await db.delete(db_user)
    await db.commit()
    return None
