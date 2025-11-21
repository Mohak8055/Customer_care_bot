from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.models import ChatSession, Message, User
from app.services.websocket_manager import manager
from app.schemas.schemas import WSMessage
from typing import Optional
import json

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/chat/{chat_session_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    chat_session_id: int,
    sender_name: Optional[str] = "Anonymous",
    sender_id: Optional[int] = None
):
    """WebSocket endpoint for chat communication"""
    await manager.connect_to_chat(websocket, chat_session_id)

    try:
        # Send connection confirmation
        await manager.send_personal_message(
            {
                "type": "connected",
                "chat_session_id": chat_session_id,
                "message": "Connected to chat"
            },
            websocket
        )

        # Notify others that someone joined
        await manager.broadcast_to_chat(
            {
                "type": "user_joined",
                "chat_session_id": chat_session_id,
                "sender_name": sender_name
            },
            chat_session_id
        )

        while True:
            # Receive message from WebSocket
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # Handle different message types
            msg_type = message_data.get("type", "message")

            if msg_type == "message":
                # Broadcast the message to all participants
                await manager.broadcast_to_chat(
                    {
                        "type": "message",
                        "chat_session_id": chat_session_id,
                        "sender_name": sender_name,
                        "sender_id": sender_id,
                        "content": message_data.get("content"),
                        "timestamp": message_data.get("timestamp")
                    },
                    chat_session_id
                )

            elif msg_type == "typing":
                # Broadcast typing indicator
                await manager.broadcast_to_chat(
                    {
                        "type": "typing",
                        "chat_session_id": chat_session_id,
                        "sender_name": sender_name,
                        "is_typing": message_data.get("is_typing", True)
                    },
                    chat_session_id
                )

    except WebSocketDisconnect:
        manager.disconnect_from_chat(websocket, chat_session_id)
        await manager.broadcast_to_chat(
            {
                "type": "user_left",
                "chat_session_id": chat_session_id,
                "sender_name": sender_name
            },
            chat_session_id
        )
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect_from_chat(websocket, chat_session_id)


@router.websocket("/ws/agent/{agent_id}")
async def websocket_agent_endpoint(
    websocket: WebSocket,
    agent_id: int,
    department_id: Optional[int] = None
):
    """WebSocket endpoint for agent notifications and status updates"""
    await manager.connect_agent(websocket, agent_id)

    # Mark agent as available
    if department_id:
        manager.mark_agent_available(agent_id, department_id)

    try:
        await manager.send_personal_message(
            {
                "type": "connected",
                "agent_id": agent_id,
                "message": "Connected to agent dashboard"
            },
            websocket
        )

        while True:
            # Receive status updates from agent
            data = await websocket.receive_text()
            message_data = json.loads(data)

            msg_type = message_data.get("type")

            if msg_type == "status_update":
                status = message_data.get("status")
                if status == "available" and department_id:
                    manager.mark_agent_available(agent_id, department_id)
                elif status == "busy" and department_id:
                    manager.mark_agent_busy(agent_id, department_id)

                await manager.send_personal_message(
                    {
                        "type": "status_updated",
                        "status": status
                    },
                    websocket
                )

    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id)
        if department_id:
            manager.mark_agent_busy(agent_id, department_id)
    except Exception as e:
        print(f"Agent WebSocket error: {e}")
        manager.disconnect_agent(agent_id)
        if department_id:
            manager.mark_agent_busy(agent_id, department_id)
