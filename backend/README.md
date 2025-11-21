# Customer Care Bot - Backend

FastAPI backend for the customer care chat system with auto-assignment and real-time communication.

## Features

- **Department Management**: Create and manage departments
- **User Management**: Admin, agents, and customer users
- **Real-time Chat**: WebSocket-based chat communication
- **Auto-assignment**: Automatically assign chats to available agents
- **Chat Transfer**: Transfer chats between departments with history
- **Agent Status**: Track agent availability (available, busy, offline)

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy .env.example to .env
copy .env.example .env

# Edit .env and update values as needed
```

### 4. Initialize Database

```bash
python init_db.py
```

This will create:
- Database tables
- Sample departments (Customer Care, Technical Support, Sales, Billing)
- Admin user and sample agents

**Default Credentials:**
- Admin: `admin` / `admin123`
- Agents: `alice_cc`, `bob_cc`, `charlie_tech`, etc. / `password123`

### 5. Run the Server

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python -m uvicorn app.main:app --reload
```

The API will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

## API Endpoints

### Departments
- `GET /api/departments/` - List all departments
- `GET /api/departments/active` - List active departments
- `GET /api/departments/{id}` - Get department details
- `POST /api/departments/` - Create department
- `PUT /api/departments/{id}` - Update department
- `DELETE /api/departments/{id}` - Delete department

### Users
- `GET /api/users/` - List all users
- `GET /api/users/agents/available` - List available agents
- `GET /api/users/{id}` - Get user details
- `POST /api/users/` - Create user
- `PUT /api/users/{id}` - Update user
- `PUT /api/users/{id}/status` - Update agent status
- `DELETE /api/users/{id}` - Delete user

### Chat Sessions
- `GET /api/chats/` - List all chat sessions
- `GET /api/chats/{id}` - Get chat session details
- `POST /api/chats/` - Create new chat session
- `GET /api/chats/{id}/messages` - Get chat messages
- `POST /api/chats/{id}/messages` - Send message
- `POST /api/chats/{id}/transfer` - Transfer chat to another department
- `PUT /api/chats/{id}/close` - Close chat session

### WebSocket
- `WS /ws/chat/{chat_session_id}` - Connect to chat room
- `WS /ws/agent/{agent_id}` - Connect agent for notifications

## Project Structure

```
backend/
├── app/
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── database.py      # Database configuration
│   └── main.py          # FastAPI app
├── init_db.py           # Database initialization script
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variables template
```

## Auto-assignment Logic

When a customer starts a chat:
1. If no department is specified, assign to Customer Care (default)
2. Find available agents in the department (status: AVAILABLE)
3. Assign to the agent with the least active chats
4. If no agent is available, chat stays in WAITING status
5. When an agent becomes available, waiting chats are auto-assigned

## Chat Transfer Flow

1. Agent initiates transfer to another department
2. Chat history is preserved
3. Previous agent is marked as available
4. Chat is auto-assigned to available agent in new department
5. System message notifies all participants about the transfer
