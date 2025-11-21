from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.models import Department
from app.schemas.schemas import Department as DepartmentSchema, DepartmentCreate, DepartmentUpdate

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("/", response_model=List[DepartmentSchema])
async def get_departments(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all departments"""
    result = await db.execute(select(Department).offset(skip).limit(limit))
    departments = result.scalars().all()
    return departments


@router.get("/active", response_model=List[DepartmentSchema])
async def get_active_departments(db: AsyncSession = Depends(get_db)):
    """Get all active departments for customer selection"""
    result = await db.execute(
        select(Department).where(Department.is_active == True)
    )
    departments = result.scalars().all()
    return departments


@router.get("/customer-care", response_model=DepartmentSchema)
async def get_customer_care_department(db: AsyncSession = Depends(get_db)):
    """Get the customer care department"""
    result = await db.execute(
        select(Department).where(Department.is_customer_care == True)
    )
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer care department not found"
        )
    return department


@router.get("/{department_id}", response_model=DepartmentSchema)
async def get_department(
    department_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific department by ID"""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    return department


@router.post("/", response_model=DepartmentSchema, status_code=status.HTTP_201_CREATED)
async def create_department(
    department: DepartmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new department"""
    # Check if department with same name exists
    result = await db.execute(
        select(Department).where(Department.name == department.name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name already exists"
        )

    db_department = Department(**department.model_dump())
    db.add(db_department)
    await db.commit()
    await db.refresh(db_department)
    return db_department


@router.put("/{department_id}", response_model=DepartmentSchema)
async def update_department(
    department_id: int,
    department_update: DepartmentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a department"""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    db_department = result.scalar_one_or_none()
    if not db_department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    update_data = department_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_department, field, value)

    await db.commit()
    await db.refresh(db_department)
    return db_department


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a department"""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    db_department = result.scalar_one_or_none()
    if not db_department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if it's customer care department
    if db_department.is_customer_care:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete customer care department"
        )

    await db.delete(db_department)
    await db.commit()
    return None
