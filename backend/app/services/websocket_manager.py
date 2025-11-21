from typing import Dict, List, Set
from fastapi import WebSocket
import json
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        # Maps: chat_session_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

        # Maps: agent_user_id -> WebSocket (for agent dashboard)
        self.agent_connections: Dict[int, WebSocket] = {}

        # Maps: department_id -> Set[agent_user_id] (available agents)
        self.available_agents: Dict[int, Set[int]] = {}

    async def connect_to_chat(self, websocket: WebSocket, chat_session_id: int):
        """Connect a client to a specific chat session"""
        await websocket.accept()
        if chat_session_id not in self.active_connections:
            self.active_connections[chat_session_id] = []
        self.active_connections[chat_session_id].append(websocket)

    async def connect_agent(self, websocket: WebSocket, agent_id: int):
        """Connect an agent to receive notifications"""
        await websocket.accept()
        self.agent_connections[agent_id] = websocket

    def disconnect_from_chat(self, websocket: WebSocket, chat_session_id: int):
        """Disconnect a client from a chat session"""
        if chat_session_id in self.active_connections:
            if websocket in self.active_connections[chat_session_id]:
                self.active_connections[chat_session_id].remove(websocket)
            if not self.active_connections[chat_session_id]:
                del self.active_connections[chat_session_id]

    def disconnect_agent(self, agent_id: int):
        """Disconnect an agent"""
        if agent_id in self.agent_connections:
            del self.agent_connections[agent_id]

    def mark_agent_available(self, agent_id: int, department_id: int):
        """Mark an agent as available in a department"""
        if department_id not in self.available_agents:
            self.available_agents[department_id] = set()
        self.available_agents[department_id].add(agent_id)

    def mark_agent_busy(self, agent_id: int, department_id: int):
        """Mark an agent as busy (remove from available pool)"""
        if department_id in self.available_agents:
            self.available_agents[department_id].discard(agent_id)

    def get_available_agent(self, department_id: int) -> int | None:
        """Get an available agent from a department"""
        if department_id in self.available_agents and self.available_agents[department_id]:
            return next(iter(self.available_agents[department_id]))
        return None

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific websocket"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")

    async def broadcast_to_chat(self, message: dict, chat_session_id: int):
        """Broadcast a message to all clients in a chat session"""
        if chat_session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[chat_session_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to chat: {e}")
                    disconnected.append(connection)

            # Clean up disconnected websockets
            for conn in disconnected:
                self.disconnect_from_chat(conn, chat_session_id)

    async def notify_agent(self, agent_id: int, message: dict):
        """Send a notification to a specific agent"""
        if agent_id in self.agent_connections:
            try:
                await self.agent_connections[agent_id].send_json(message)
            except Exception as e:
                print(f"Error notifying agent: {e}")
                self.disconnect_agent(agent_id)

    async def notify_department_agents(self, department_id: int, message: dict):
        """Notify all agents in a department"""
        if department_id in self.available_agents:
            for agent_id in list(self.available_agents[department_id]):
                await self.notify_agent(agent_id, message)


# Global instance
manager = ConnectionManager()
