# Customer Care Bot - Frontend

Angular frontend for the customer care chat system.

## Features

### Customer Chat Interface
- Department selection before starting chat
- Real-time messaging with WebSocket
- Typing indicators
- Auto-assignment to available agents
- Mobile-responsive design

### Admin Dashboard
- **Department Management**
  - Create, edit, and delete departments
  - Toggle department active status
  - Mark customer care department

- **User Management**
  - Create and manage users (Admin, Agent, Customer)
  - Assign agents to departments
  - Filter users by role and department
  - Update agent status

## Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
- Edit `src/environments/environment.ts` if your backend is not running on `http://localhost:8000`

3. Start development server:
```bash
npm start
```

The application will be available at: `http://localhost:4200`

## Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── admin/           # Admin dashboard components
│   │   │   │   ├── admin-dashboard.component.ts
│   │   │   │   ├── department-management.component.ts
│   │   │   │   └── user-management.component.ts
│   │   │   └── chat/            # Chat interface components
│   │   │       └── chat-interface.component.ts
│   │   ├── models/              # TypeScript interfaces
│   │   │   └── models.ts
│   │   ├── services/            # API and WebSocket services
│   │   │   ├── api.service.ts
│   │   │   └── websocket.service.ts
│   │   ├── app.component.ts     # Root component
│   │   ├── app.routes.ts        # Routing configuration
│   │   └── app.config.ts        # App configuration
│   ├── environments/            # Environment configurations
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── angular.json
├── package.json
└── tsconfig.json
```

## Routes

- `/chat` - Customer chat interface
- `/admin` - Admin dashboard

## Components

### Chat Interface
The customer-facing chat interface with department selection and real-time messaging.

**Features:**
- Customer information form (name, email)
- Department selection (optional)
- Real-time chat with assigned agent
- Message history
- Typing indicators
- Chat close functionality

### Admin Dashboard
Management interface for departments and users.

**Department Management:**
- View all departments
- Create new departments
- Edit department details
- Mark as customer care department
- Activate/deactivate departments

**User Management:**
- View all users with filters
- Create new users (Admin, Agent, Customer)
- Edit user details
- Assign agents to departments
- View agent status (Available, Busy, Offline)

## Services

### ApiService
Handles all HTTP requests to the backend API.

Methods:
- Department CRUD operations
- User CRUD operations
- Chat session management
- Message handling
- Chat transfer

### WebSocketService
Manages WebSocket connections for real-time communication.

Features:
- Connect to chat rooms
- Connect agents for notifications
- Send/receive messages
- Typing indicators
- Status updates

## Customization

### Styling
Global styles are in `src/styles.css`. Component-specific styles are defined in each component's `styles` array.

### API Configuration
Update the API and WebSocket URLs in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://your-api-url',
  wsUrl: 'ws://your-api-url'
};
```

## Integration

This chat interface can be integrated into existing projects by:

1. Installing as a standalone component
2. Embedding the chat interface using an iframe
3. Copying the chat component into your project
4. Using the API service independently

For integration, you primarily need:
- `ChatInterfaceComponent` for customer chat
- `ApiService` for backend communication
- `WebSocketService` for real-time updates
