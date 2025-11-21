from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, asc
from sqlalchemy.orm import selectinload
from app.models.models import User, ChatSession, Department, UserRole, AgentStatus, ChatStatus
from app.services.websocket_manager import manager
from typing import Optional, Tuple

# Average chat duration in minutes (for wait time estimation)
AVERAGE_CHAT_DURATION_MINUTES = 5


async def get_customer_care_department(db: AsyncSession) -> Optional[Department]:
    """Get the customer care department"""
    result = await db.execute(
        select(Department).where(
            and_(Department.is_customer_care == True, Department.is_active == True)
        )
    )
    return result.scalar_one_or_none()


async def get_queue_position(db: AsyncSession, chat_session_id: int) -> Tuple[int, int]:
    """
    Get the queue position for a waiting chat session.
    Returns (position, estimated_wait_minutes)
    """
    # Get the chat session
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == chat_session_id)
    )
    chat = result.scalar_one_or_none()

    if not chat or chat.status != ChatStatus.WAITING:
        return (0, 0)

    # Count how many waiting chats are ahead (created before this one) in same department
    count_result = await db.execute(
        select(func.count(ChatSession.id)).where(
            and_(
                ChatSession.department_id == chat.department_id,
                ChatSession.status == ChatStatus.WAITING,
                ChatSession.created_at < chat.created_at
            )
        )
    )
    position = (count_result.scalar() or 0) + 1

    # Get available agent count for wait time estimation
    agents_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.department_id == chat.department_id,
                User.role == UserRole.AGENT,
                User.is_active == True,
                User.agent_status == AgentStatus.AVAILABLE
            )
        )
    )
    available_agents = agents_result.scalar() or 0

    # Estimate wait time
    if available_agents > 0:
        estimated_wait = (position // max(available_agents, 1)) * AVERAGE_CHAT_DURATION_MINUTES
    else:
        estimated_wait = position * AVERAGE_CHAT_DURATION_MINUTES

    return (position, estimated_wait)


async def get_department_agent_stats(db: AsyncSession, department_id: int) -> Tuple[int, int]:
    """Get count of available and busy agents in a department"""
    available_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.department_id == department_id,
                User.role == UserRole.AGENT,
                User.is_active == True,
                User.agent_status == AgentStatus.AVAILABLE
            )
        )
    )
    available = available_result.scalar() or 0

    busy_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.department_id == department_id,
                User.role == UserRole.AGENT,
                User.is_active == True,
                User.agent_status == AgentStatus.BUSY
            )
        )
    )
    busy = busy_result.scalar() or 0

    return (available, busy)


async def get_available_agent_in_department(db: AsyncSession, department_id: int) -> Optional[User]:
    """
    Find an available agent in a department who is:
    1. Active
    2. Has agent role
    3. Status is AVAILABLE
    4. Has NO active chats (one agent = one chat at a time)
    """
    # Query database for available agents - this is the source of truth
    result = await db.execute(
        select(User).where(
            and_(
                User.department_id == department_id,
                User.role == UserRole.AGENT,
                User.is_active == True,
                User.agent_status == AgentStatus.AVAILABLE
            )
        )
    )
    agents = result.scalars().all()

    if not agents:
        return None

    # Find first agent with NO active chats (one chat at a time rule)
    for agent in agents:
        active_chats_result = await db.execute(
            select(func.count(ChatSession.id)).where(
                and_(
                    ChatSession.assigned_agent_id == agent.id,
                    ChatSession.status == ChatStatus.ACTIVE
                )
            )
        )
        active_chats_count = active_chats_result.scalar() or 0

        # Only return agent if they have NO active chats
        if active_chats_count == 0:
            return agent

    return None


async def agent_has_active_chat(db: AsyncSession, agent_id: int) -> bool:
    """Check if agent already has an active chat"""
    result = await db.execute(
        select(func.count(ChatSession.id)).where(
            and_(
                ChatSession.assigned_agent_id == agent_id,
                ChatSession.status == ChatStatus.ACTIVE
            )
        )
    )
    count = result.scalar() or 0
    return count > 0


async def assign_chat_to_agent(
    db: AsyncSession,
    chat_session: ChatSession,
    agent: User,
    set_agent_busy: bool = True
) -> ChatSession:
    """Assign a chat session to an agent and optionally set agent status to BUSY"""
    chat_session.assigned_agent_id = agent.id
    chat_session.status = ChatStatus.ACTIVE

    # Set agent status to BUSY when assigned
    if set_agent_busy:
        agent.agent_status = AgentStatus.BUSY

    await db.commit()

    # Re-fetch with relationships loaded
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == chat_session.id)
    )
    chat_session = result.scalar_one_or_none()

    # Notify the agent about the new assignment
    try:
        await manager.notify_agent(agent.id, {
            "type": "new_assignment",
            "chat_session_id": chat_session.id,
            "customer_name": chat_session.customer_name,
            "customer_email": chat_session.customer_email
        })
    except Exception as e:
        print(f"Could not notify agent: {e}")

    # Notify the customer that agent has joined
    try:
        await manager.broadcast_to_chat(
            {
                "type": "agent_assigned",
                "chat_session_id": chat_session.id,
                "agent_name": agent.full_name or agent.username,
                "message": f"{agent.full_name or agent.username} has joined the chat."
            },
            chat_session.id
        )
    except Exception as e:
        print(f"Could not notify customer: {e}")

    return chat_session


async def auto_assign_chat(db: AsyncSession, chat_session_id: int) -> Optional[ChatSession]:
    """
    Automatically assign a chat to an available agent
    """
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == chat_session_id)
    )
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        return None

    # If already assigned, return as is
    if chat_session.assigned_agent_id:
        return chat_session

    # Find available agent in the department
    agent = await get_available_agent_in_department(db, chat_session.department_id)

    if agent:
        return await assign_chat_to_agent(db, chat_session, agent)
    else:
        # No agent available, chat remains in WAITING status
        chat_session.status = ChatStatus.WAITING
        await db.commit()

        # Notify customer they're in queue
        position, wait_time = await get_queue_position(db, chat_session_id)
        try:
            await manager.broadcast_to_chat(
                {
                    "type": "queue_status",
                    "chat_session_id": chat_session_id,
                    "position": position,
                    "estimated_wait_minutes": wait_time,
                    "message": f"All agents are currently busy. You are #{position} in queue. Estimated wait: {wait_time} minutes."
                },
                chat_session_id
            )
        except Exception as e:
            print(f"Could not notify customer of queue status: {e}")

        # Re-fetch with relationships loaded
        result = await db.execute(
            select(ChatSession)
            .options(
                selectinload(ChatSession.department),
                selectinload(ChatSession.assigned_agent)
            )
            .where(ChatSession.id == chat_session_id)
        )
        return result.scalar_one_or_none()


async def get_next_waiting_chat(db: AsyncSession, department_id: int) -> Optional[ChatSession]:
    """Get the oldest waiting chat in a department (FIFO)"""
    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(
            and_(
                ChatSession.department_id == department_id,
                ChatSession.status == ChatStatus.WAITING
            )
        )
        .order_by(asc(ChatSession.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def claim_chat_with_lock(
    db: AsyncSession,
    chat_session_id: int,
    agent_id: int
) -> Optional[ChatSession]:
    """
    Claim a chat with database locking to prevent race conditions.
    Returns None if chat is already claimed or agent already has an active chat.
    """
    # Check if agent already has an active chat (one chat at a time rule)
    if await agent_has_active_chat(db, agent_id):
        return None

    # Use FOR UPDATE to lock the row and prevent race conditions
    result = await db.execute(
        select(ChatSession)
        .where(
            and_(
                ChatSession.id == chat_session_id,
                ChatSession.status == ChatStatus.WAITING
            )
        )
        .with_for_update(skip_locked=True)
    )
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        # Chat already claimed or doesn't exist
        return None

    # Get the agent
    agent_result = await db.execute(
        select(User).where(User.id == agent_id)
    )
    agent = agent_result.scalar_one_or_none()

    if not agent:
        return None

    # Assign the chat
    return await assign_chat_to_agent(db, chat_session, agent)


async def handle_chat_close_assignment(
    db: AsyncSession,
    agent_id: int,
    department_id: int
) -> Optional[ChatSession]:
    """
    Handle auto-assignment when an agent closes a chat.
    Finds the next waiting chat and sends notification to agent.
    Agent stays BUSY until they accept/decline or if no waiting chats.
    """
    agent_result = await db.execute(
        select(User).where(User.id == agent_id)
    )
    agent = agent_result.scalar_one_or_none()

    if not agent:
        return None

    # Find next waiting chat
    next_chat = await get_next_waiting_chat(db, department_id)

    if next_chat:
        # Keep agent BUSY - they'll get the notification with timer
        # Only becomes AVAILABLE after accepting (then busy again) or declining (offline)
        agent.agent_status = AgentStatus.BUSY
        await db.commit()

        # Notify agent of incoming assignment with 10-second timer
        try:
            await manager.notify_agent(agent_id, {
                "type": "incoming_assignment",
                "chat_session_id": next_chat.id,
                "customer_name": next_chat.customer_name,
                "customer_email": next_chat.customer_email,
                "timeout_seconds": 10,
                "message": f"New customer waiting: {next_chat.customer_name}. Accept within 10 seconds or change your status."
            })
        except Exception as e:
            print(f"Could not notify agent of incoming assignment: {e}")
    else:
        # No waiting chats - set agent to AVAILABLE
        agent.agent_status = AgentStatus.AVAILABLE
        await db.commit()

    return next_chat


async def transfer_chat(
    db: AsyncSession,
    chat_session_id: int,
    target_department_id: int,
    reason: Optional[str] = None
) -> ChatSession:
    """
    Transfer a chat to another department
    """
    # Verify target department exists and is active
    dept_result = await db.execute(
        select(Department).where(
            and_(Department.id == target_department_id, Department.is_active == True)
        )
    )
    target_dept = dept_result.scalar_one_or_none()
    if not target_dept:
        raise ValueError("Target department not found or not active")

    result = await db.execute(
        select(ChatSession)
        .options(
            selectinload(ChatSession.department),
            selectinload(ChatSession.assigned_agent)
        )
        .where(ChatSession.id == chat_session_id)
    )
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        raise ValueError("Chat session not found")

    # Store old department name for message
    old_dept_name = chat_session.department.name if chat_session.department else "Unknown"
    old_agent_id = chat_session.assigned_agent_id
    old_department_id = chat_session.department_id

    # Update chat session
    chat_session.department_id = target_department_id
    chat_session.assigned_agent_id = None
    chat_session.status = ChatStatus.WAITING
    chat_session.transferred_from = chat_session_id

    await db.commit()

    # Set previous agent back to AVAILABLE
    if old_agent_id:
        agent_result = await db.execute(
            select(User).where(User.id == old_agent_id)
        )
        old_agent = agent_result.scalar_one_or_none()
        if old_agent:
            old_agent.agent_status = AgentStatus.AVAILABLE
            await db.commit()

    # Try to auto-assign in new department
    chat_session = await auto_assign_chat(db, chat_session_id)

    # Send system message about transfer
    transfer_message = f"Chat transferred from {old_dept_name} to {target_dept.name}."
    if reason:
        transfer_message += f" Reason: {reason}"

    try:
        await manager.broadcast_to_chat(
            {
                "type": "system_message",
                "chat_session_id": chat_session_id,
                "content": transfer_message,
                "is_system_message": True
            },
            chat_session_id
        )
    except Exception as e:
        print(f"Could not broadcast transfer message: {e}")

    return chat_session
