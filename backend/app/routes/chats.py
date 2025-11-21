from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.models import ChatSession, Message, ChatStatus, Department, User, AgentStatus
from app.schemas.schemas import (
    ChatSession as ChatSessionSchema,
    ChatSessionCreate,
    ChatSessionWithDetails,
    Message as MessageSchema,
    MessageCreate,
    TransferRequest,
    QueueStatus
)
from app.services.assignment_service import (
    auto_assign_chat,
    transfer_chat,
    get_customer_care_department,
    claim_chat_with_lock,
    handle_chat_close_assignment,
    get_queue_position,
    get_department_agent_stats,
    agent_has_active_chat
)
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.get("/", response_model=List[ChatSessionWithDetails])
async def get_chat_sessions(
    skip: int = 0,
    limit: int = 100,
    status_filter: ChatStatus = None,
    department_id: int = None,
    agent_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all chat sessions with optional filters"""
    query = select(ChatSession).options(
        selectinload(ChatSession.department),
        selectinload(ChatSession.assigned_agent)
    )

    if status_filter:
        query = query.where(ChatSession.status == status_filter)
    if department_id:
        query = query.where(ChatSession.department_id == department_id)
    if agent_id:
        query = query.where(ChatSession.assigned_agent_id == agent_id)

    query = query.order_by(desc(ChatSession.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    sessions = result.scalars().all()
    return sessions


@router.get("/{chat_session_id}", response_model=ChatSessionWithDetails)
async def get_chat_session(
    chat_session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific chat session by ID"""
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == chat_session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return session


@router.get("/{chat_session_id}/queue-status", response_model=QueueStatus)
async def get_chat_queue_status(
    chat_session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get queue status for a waiting chat session"""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == chat_session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    position, estimated_wait = await get_queue_position(db, chat_session_id)
    available, busy = await get_department_agent_stats(db, session.department_id)

    return QueueStatus(
        chat_session_id=chat_session_id,
        position=position,
        estimated_wait_minutes=estimated_wait,
        status=session.status,
        agents_available=available,
        agents_busy=busy
    )


@router.post("/", response_model=ChatSessionWithDetails, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    chat_data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session"""
    # If no department specified, use customer care department
    department_id = chat_data.department_id
    if not department_id:
        customer_care = await get_customer_care_department(db)
        if not customer_care:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Customer care department not configured"
            )
        department_id = customer_care.id

    # Create chat session
    db_chat = ChatSession(
        customer_name=chat_data.customer_name,
        customer_email=chat_data.customer_email,
        department_id=department_id,
        status=ChatStatus.WAITING
    )
    db.add(db_chat)
    await db.commit()
    await db.refresh(db_chat)

    # Try to auto-assign to an available agent
    db_chat = await auto_assign_chat(db, db_chat.id)

    return db_chat


@router.get("/{chat_session_id}/messages", response_model=List[MessageSchema])
async def get_chat_messages(
    chat_session_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a chat session"""
    # Verify chat session exists
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == chat_session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Get messages
    result = await db.execute(
        select(Message)
        .where(Message.chat_session_id == chat_session_id)
        .order_by(Message.created_at)
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()
    return messages


@router.post("/{chat_session_id}/messages", response_model=MessageSchema, status_code=status.HTTP_201_CREATED)
async def create_message(
    chat_session_id: int,
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new message in a chat session"""
    # Verify chat session exists
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == chat_session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Create message
    db_message = Message(**message_data.model_dump())
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)

    # Broadcast message to all connected clients
    await manager.broadcast_to_chat(
        {
            "type": "message",
            "message_id": db_message.id,
            "chat_session_id": db_message.chat_session_id,
            "sender_name": db_message.sender_name,
            "content": db_message.content,
            "is_system_message": db_message.is_system_message,
            "created_at": str(db_message.created_at)
        },
        chat_session_id
    )

    return db_message


@router.post("/{chat_session_id}/transfer", response_model=ChatSessionWithDetails)
async def transfer_chat_session(
    chat_session_id: int,
    transfer_data: TransferRequest,
    db: AsyncSession = Depends(get_db)
):
    """Transfer a chat session to another department"""
    try:
        updated_session = await transfer_chat(
            db,
            chat_session_id,
            transfer_data.target_department_id,
            transfer_data.reason
        )
        return updated_session
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{chat_session_id}/claim", response_model=ChatSessionWithDetails)
async def claim_chat_session(
    chat_session_id: int,
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Claim a waiting chat session as an agent (with race condition protection)"""
    # Check if agent already has an active chat
    if await agent_has_active_chat(db, agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active chat. Please close it before claiming another."
        )

    # Use locked claim to prevent race conditions
    session = await claim_chat_with_lock(db, chat_session_id, agent_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Chat session already claimed or not available"
        )

    # Notify the customer that an agent has joined
    agent_result = await db.execute(
        select(User).where(User.id == agent_id)
    )
    agent = agent_result.scalar_one_or_none()

    await manager.broadcast_to_chat(
        {
            "type": "agent_assigned",
            "chat_session_id": chat_session_id,
            "agent_name": agent.full_name or agent.username if agent else "Agent",
            "message": f"{agent.full_name or agent.username if agent else 'An agent'} has joined the chat."
        },
        chat_session_id
    )

    return session


@router.put("/{chat_session_id}/close", response_model=ChatSessionWithDetails)
async def close_chat_session(
    chat_session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Close a chat session and trigger auto-assignment for waiting chats"""
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == chat_session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    agent_id = session.assigned_agent_id
    department_id = session.department_id

    session.status = ChatStatus.CLOSED
    session.closed_at = datetime.utcnow()

    await db.commit()

    # Re-fetch with relationships loaded
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == chat_session_id)
    )
    session = result.scalar_one_or_none()

    # Notify all participants
    await manager.broadcast_to_chat(
        {
            "type": "chat_closed",
            "chat_session_id": chat_session_id,
            "message": "Chat session has been closed"
        },
        chat_session_id
    )

    # Handle auto-assignment for the agent who closed the chat
    if agent_id and department_id:
        await handle_chat_close_assignment(db, agent_id, department_id)

    return session


@router.put("/{chat_session_id}/accept-assignment", response_model=ChatSessionWithDetails)
async def accept_incoming_assignment(
    chat_session_id: int,
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Agent accepts an incoming auto-assignment"""
    # Check if agent already has an active chat
    if await agent_has_active_chat(db, agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active chat. Please close it first."
        )

    session = await claim_chat_with_lock(db, chat_session_id, agent_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Chat session already claimed or not available"
        )

    return session


@router.put("/{chat_session_id}/decline-assignment")
async def decline_incoming_assignment(
    chat_session_id: int,
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Agent declines an incoming auto-assignment, setting their status to unavailable"""
    # Set agent to unavailable
    agent_result = await db.execute(
        select(User).where(User.id == agent_id)
    )
    agent = agent_result.scalar_one_or_none()

    if agent:
        agent.agent_status = AgentStatus.OFFLINE
        await db.commit()

    # Try to assign to another agent
    await auto_assign_chat(db, chat_session_id)

    return {"message": "Assignment declined, status set to offline"}
