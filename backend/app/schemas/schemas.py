from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.models import UserRole, ChatStatus, AgentStatus


# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    is_customer_care: bool = False


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_customer_care: Optional[bool] = None


class Department(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    department_id: Optional[int] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    agent_status: Optional[AgentStatus] = None


class User(UserBase):
    id: int
    is_active: bool
    agent_status: AgentStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserWithDepartment(User):
    department: Optional[Department] = None


# Chat Session Schemas
class ChatSessionCreate(BaseModel):
    customer_name: str
    customer_email: str
    department_id: Optional[int] = None  # If None, assign to customer care


class ChatSessionUpdate(BaseModel):
    department_id: Optional[int] = None
    assigned_agent_id: Optional[int] = None
    status: Optional[ChatStatus] = None


class ChatSession(BaseModel):
    id: int
    customer_name: str
    customer_email: str
    department_id: int
    assigned_agent_id: Optional[int] = None
    status: ChatStatus
    transferred_from: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSessionWithDetails(ChatSession):
    department: Department
    assigned_agent: Optional[User] = None


# Message Schemas
class MessageCreate(BaseModel):
    chat_session_id: int
    sender_id: Optional[int] = None
    sender_name: str
    content: str
    is_system_message: bool = False


class Message(BaseModel):
    id: int
    chat_session_id: int
    sender_id: Optional[int] = None
    sender_name: str
    content: str
    is_system_message: bool
    created_at: datetime

    class Config:
        from_attributes = True


# WebSocket Message Schemas
class WSMessage(BaseModel):
    type: str  # 'message', 'join', 'leave', 'transfer', 'typing', etc.
    chat_session_id: Optional[int] = None
    sender_name: Optional[str] = None
    content: Optional[str] = None
    department_id: Optional[int] = None
    timestamp: Optional[datetime] = None


# Transfer Request Schema
class TransferRequest(BaseModel):
    chat_session_id: int
    target_department_id: int
    reason: Optional[str] = None


# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User


# Review Schemas
class ReviewCreate(BaseModel):
    chat_session_id: int
    rating: int  # 1-5
    comment: Optional[str] = None


class Review(BaseModel):
    id: int
    chat_session_id: int
    rating: int
    comment: Optional[str] = None
    customer_name: str
    customer_email: str
    agent_id: Optional[int] = None
    agent_name: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewStats(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict


# Queue Status Schema
class QueueStatus(BaseModel):
    chat_session_id: int
    position: int
    estimated_wait_minutes: int
    status: ChatStatus
    agents_available: int
    agents_busy: int
