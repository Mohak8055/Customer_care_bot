# Customer Care Bot

A full-stack customer care chat system with auto-assignment, real-time messaging, and department management.

## Features

### Core Functionality
- **Real-time Chat**: WebSocket-based instant messaging between customers and agents
- **Auto-assignment**: Automatically assigns customers to available agents based on workload
- **Department Management**: Organize support teams by departments
- **Chat Transfer**: Transfer chats between departments with complete history preservation
- **Multi-interface**: Separate interfaces for customers and administrators

### Customer Features
- Department selection (or auto-assign to customer care)
- Real-time messaging with assigned agents
- Typing indicators
- Chat history
- Mobile-responsive interface

### Agent Features
- Real-time notification of new assignments
- Status management (Available, Busy, Offline)
- Chat transfer capability
- Multiple concurrent chats support

### Admin Features
- Department CRUD operations
- User management (Admin, Agent, Customer roles)
- Agent assignment to departments
- System configuration

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM with async support
- **WebSockets**: Real-time bidirectional communication
- **SQLite**: Database (easily replaceable with PostgreSQL/MySQL)
- **Pydantic**: Data validation

### Frontend
- **Angular 17**: Component-based framework
- **TypeScript**: Type-safe development
- **RxJS**: Reactive programming
- **Standalone Components**: Modern Angular architecture
- **Native WebSocket API**: Real-time communication

## Project Structure

```
customerbot/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── database.py     # Database configuration
│   │   └── main.py         # FastAPI application
│   ├── init_db.py          # Database initialization
│   ├── requirements.txt    # Python dependencies
│   ├── setup.bat          # Windows setup script
│   └── README.md
│
└── frontend/               # Angular frontend
    ├── src/
    │   ├── app/
    │   │   ├── components/ # UI components
    │   │   ├── models/     # TypeScript interfaces
    │   │   └── services/   # API & WebSocket services
    │   └── environments/   # Configuration
    ├── package.json
    └── README.md
```

## Quick Start

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Run setup script (Windows):**
   ```bash
   setup.bat
   ```

   **Or manually:**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac

   # Install dependencies
   pip install -r requirements.txt

   # Initialize database
   python init_db.py
   ```

3. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   Backend will be available at: `http://localhost:8000`
   API docs: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

   Frontend will be available at: `http://localhost:4200`

## Default Credentials

After running `init_db.py`, the following users are created:

### Admin
- **Username**: `admin`
- **Password**: `admin123`

### Sample Agents
- **Username**: `alice_cc`, `bob_cc`, `charlie_tech`, `diana_tech`, `eve_sales`, `frank_billing`
- **Password**: `password123` (for all agents)

## Usage

### Customer Flow

1. Navigate to `http://localhost:4200/chat`
2. Enter name and email
3. Select a department (or leave unselected for customer care)
4. Click "Start Chat"
5. Wait for auto-assignment to available agent
6. Chat with assigned agent
7. Close chat when done

### Admin Flow

1. Navigate to `http://localhost:4200/admin`
2. Use tabs to switch between:
   - **Departments**: Create, edit, delete departments
   - **Users**: Manage admin, agents, and assign to departments

### Agent Workflow

1. Agent status determines availability
2. When a customer starts a chat:
   - System finds available agent in the department
   - Agent with least active chats gets assigned
   - Agent receives real-time notification
3. Agent can transfer chat to another department if needed
4. Chat history is preserved during transfers

## Auto-Assignment Logic

The system implements intelligent agent assignment:

1. **Customer initiates chat** → Selects department or defaults to customer care
2. **System checks availability** → Finds agents with "Available" status
3. **Load balancing** → Assigns to agent with fewest active chats
4. **No agent available** → Chat enters waiting queue
5. **Agent becomes available** → Waiting chats are auto-assigned

## API Endpoints

### Departments
- `GET /api/departments/` - List all departments
- `POST /api/departments/` - Create department
- `PUT /api/departments/{id}` - Update department
- `DELETE /api/departments/{id}` - Delete department

### Users
- `GET /api/users/` - List users (with filters)
- `POST /api/users/` - Create user
- `PUT /api/users/{id}` - Update user
- `PUT /api/users/{id}/status` - Update agent status

### Chats
- `GET /api/chats/` - List chat sessions
- `POST /api/chats/` - Create chat session
- `GET /api/chats/{id}/messages` - Get messages
- `POST /api/chats/{id}/messages` - Send message
- `POST /api/chats/{id}/transfer` - Transfer chat
- `PUT /api/chats/{id}/close` - Close chat

### WebSocket
- `WS /ws/chat/{chat_session_id}` - Customer/Agent chat connection
- `WS /ws/agent/{agent_id}` - Agent notification connection

## Configuration

### Backend (.env)
```env
DATABASE_URL=sqlite:///./customerbot.db
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:4200
```

### Frontend (environment.ts)
```typescript
export const environment = {
  apiUrl: 'http://localhost:8000',
  wsUrl: 'ws://localhost:8000'
};
```

## Database Schema

### Main Tables
- **departments**: Department information
- **users**: Admin, agents, and customers
- **chat_sessions**: Active and historical chats
- **messages**: Chat messages with timestamps

### Key Relationships
- Users belong to departments (for agents)
- Chat sessions are assigned to departments and agents
- Messages belong to chat sessions

## Production Deployment

### Backend
1. Use production database (PostgreSQL/MySQL)
2. Set secure `SECRET_KEY` in .env
3. Configure CORS properly
4. Use production ASGI server (uvicorn with workers)
5. Set up HTTPS

### Frontend
1. Build for production: `npm run build`
2. Deploy dist/ folder to web server
3. Update environment.prod.ts with production API URL
4. Configure HTTPS

## Integration Guide

The chat interface can be integrated into existing applications:

### As Iframe
```html
<iframe src="http://localhost:4200/chat" width="100%" height="600px"></iframe>
```

### As Component
Copy the chat component and services into your Angular project.

### As Standalone Widget
Use the API service independently to build custom UI.

## Future Enhancements

- [ ] File sharing in chats
- [ ] Chat ratings and feedback
- [ ] Agent performance analytics
- [ ] Email notifications
- [ ] Canned responses
- [ ] Chat queue management dashboard
- [ ] Multi-language support
- [ ] Chat transcripts export
- [ ] Integration with CRM systems

## Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed
- Check if port 8000 is available
- Verify database file permissions

### Frontend won't start
- Ensure Node.js 18+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if port 4200 is available

### WebSocket connection fails
- Verify backend is running
- Check CORS configuration
- Ensure WebSocket URL is correct in environment.ts

## License

This project is open source and available for use and modification.

## Support

For issues and questions:
- Check the README files in backend/ and frontend/ directories
- Review API documentation at `/docs` endpoint
- Examine sample data created by init_db.py
