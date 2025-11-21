from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"
    CUSTOMER = "customer"


class ChatStatus(str, enum.Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    TRANSFERRED = "transferred"
    CLOSED = "closed"


class AgentStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_customer_care = Column(Boolean, default=False)  # Flag for customer care department
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="department")
    chat_sessions = relationship("ChatSession", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    agent_status = Column(Enum(AgentStatus), default=AgentStatus.AVAILABLE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="users")
    assigned_chats = relationship("ChatSession", back_populates="assigned_agent")
    sent_messages = relationship("Message", back_populates="sender")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100))
    customer_email = Column(String(100))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ChatStatus), default=ChatStatus.WAITING)
    transferred_from = Column(Integer, ForeignKey("chat_sessions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    department = relationship("Department", back_populates="chat_sessions")
    assigned_agent = relationship("User", back_populates="assigned_chats")
    messages = relationship("Message", back_populates="chat_session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null for customer messages
    sender_name = Column(String(100), nullable=False)  # Store customer name or agent name
    content = Column(Text, nullable=False)
    is_system_message = Column(Boolean, default=False)  # For transfer notifications, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    chat_session = relationship("ChatSession", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    chat_session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, unique=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    chat_session = relationship("ChatSession", backref="review")
    agent = relationship("User")
    department = relationship("Department")
