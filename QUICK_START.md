# Quick Start Guide

Get the Customer Care Bot running in 5 minutes!

## Prerequisites
- Python 3.8 or higher
- Node.js 18 or higher
- Git (optional)

## Step 1: Setup Backend (2 minutes)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python init_db.py
```

## Step 2: Setup Frontend (2 minutes)

```bash
cd frontend
npm install
```

## Step 3: Run Everything (1 minute)

### Option A: Using the start script (Windows)
```bash
# From the customerbot root directory
start-all.bat
```

### Option B: Manually

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # or source venv/bin/activate on Linux/Mac
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## Access the Application

- **Frontend**: http://localhost:4200
- **Customer Chat**: http://localhost:4200/chat
- **Admin Dashboard**: http://localhost:4200/admin
- **API Docs**: http://localhost:8000/docs
- **API**: http://localhost:8000

## Test the System

### Test Customer Chat
1. Go to http://localhost:4200/chat
2. Enter your name and email
3. Select a department (or leave blank for customer care)
4. Click "Start Chat"
5. Send messages and see them in real-time

### Test Admin Functions
1. Go to http://localhost:4200/admin
2. Login credentials:
   - Username: `admin`
   - Password: `admin123`
3. Try these features:
   - **Departments Tab**: Add a new department
   - **Users Tab**: Create a new agent and assign to a department

## Sample Data

The system comes pre-loaded with:

### Departments
- Customer Care (default)
- Technical Support
- Sales
- Billing

### Users
- 1 Admin user
- 6 Agent users across all departments

All agent passwords are: `password123`

## What's Next?

- Read the [full README](README.md) for detailed features
- Check [backend/README.md](backend/README.md) for API details
- Review [frontend/README.md](frontend/README.md) for UI customization
- Explore the API documentation at http://localhost:8000/docs

## Common Issues

**Backend won't start?**
- Make sure Python 3.8+ is installed: `python --version`
- Check if port 8000 is free

**Frontend won't start?**
- Make sure Node.js 18+ is installed: `node --version`
- Try deleting node_modules and running `npm install` again
- Check if port 4200 is free

**Database errors?**
- Delete `customerbot.db` and run `python init_db.py` again

**WebSocket not connecting?**
- Make sure both backend and frontend are running
- Check browser console for errors
- Verify the WebSocket URL in `frontend/src/environments/environment.ts`

## Key Features to Try

1. **Auto-Assignment**: Start multiple chats and see how they're distributed to agents
2. **Real-time Messaging**: Open chat in two browsers and see instant updates
3. **Department Transfer**: (Requires implementing agent interface) Transfer chats between departments
4. **Admin Management**: Create departments and assign agents

## Development Tips

- Backend auto-reloads on file changes (thanks to `--reload` flag)
- Frontend auto-reloads on file changes (Angular dev server)
- Check API docs at `/docs` for all available endpoints
- Use browser DevTools to monitor WebSocket connections

Enjoy your Customer Care Bot! 🚀
