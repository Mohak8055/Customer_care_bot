from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from app.database import init_db
from app.routes import departments, users, chats, websocket, auth, reviews

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    await init_db()
    print("Database initialized")
    yield
    # Shutdown: cleanup if needed
    print("Shutting down...")


app = FastAPI(
    title="Customer Care Bot API",
    description="Backend API for customer care chat system with auto-assignment",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - Allow multiple ports for testing
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:4200,http://localhost:4201,http://localhost:4202,http://localhost:4203,http://localhost:4204,http://localhost:4205,http://127.0.0.1:4200,http://127.0.0.1:4201,http://127.0.0.1:4202"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(users.router)
app.include_router(chats.router)
app.include_router(reviews.router)
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {
        "message": "Customer Care Bot API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
