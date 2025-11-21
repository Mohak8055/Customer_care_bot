import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, init_db
from app.models.models import Department, User, UserRole, AgentStatus
from app.services.auth import get_password_hash


async def create_sample_data():
    """Create sample departments and users"""
    async with AsyncSessionLocal() as session:
        # Create departments
        departments = [
            Department(
                name="Customer Care",
                description="General customer support and initial contact",
                is_active=True,
                is_customer_care=True
            ),
            Department(
                name="Technical Support",
                description="Technical issues and troubleshooting",
                is_active=True,
                is_customer_care=False
            ),
            Department(
                name="Sales",
                description="Product inquiries and sales",
                is_active=True,
                is_customer_care=False
            ),
            Department(
                name="Billing",
                description="Billing and payment related queries",
                is_active=True,
                is_customer_care=False
            )
        ]

        for dept in departments:
            session.add(dept)

        await session.commit()

        # Refresh to get IDs
        for dept in departments:
            await session.refresh(dept)

        # Create admin user
        admin = User(
            username="admin",
            email="admin@customerbot.com",
            hashed_password=get_password_hash("password"),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            is_active=True,
            agent_status=AgentStatus.OFFLINE
        )
        session.add(admin)

        # Create agents for each department
        agents = [
            # Customer Care agents
            User(
                username="alice_cc",
                email="alice@customerbot.com",
                hashed_password=get_password_hash("password123"),
                full_name="Alice Johnson",
                role=UserRole.AGENT,
                department_id=departments[0].id,  # Customer Care
                is_active=True,
                agent_status=AgentStatus.AVAILABLE
            ),
            User(
                username="bob_cc",
                email="bob@customerbot.com",
                hashed_password=get_password_hash("password123"),
                full_name="Bob Smith",
                role=UserRole.AGENT,
                department_id=departments[0].id,  # Customer Care
                is_active=True,
                agent_status=AgentStatus.AVAILABLE
            ),
            # Technical Support agents
            User(
                username="charlie_tech",
                email="charlie@customerbot.com",
                hashed_password=get_password_hash("password123"),
                full_name="Charlie Brown",
                role=UserRole.AGENT,
                department_id=departments[1].id,  # Technical Support
                is_active=True,
                agent_status=AgentStatus.AVAILABLE
            ),
            User(
                username="diana_tech",
                email="diana@customerbot.com",
                hashed_password=get_password_hash("password123"),
                full_name="Diana Prince",
                role=UserRole.AGENT,
                department_id=departments[1].id,  # Technical Support
                is_active=True,
                agent_status=AgentStatus.AVAILABLE
            ),
            # Sales agents
            User(
                username="eve_sales",
                email="eve@customerbot.com",
                hashed_password=get_password_hash("password123"),
                full_name="Eve Wilson",
                role=UserRole.AGENT,
                department_id=departments[2].id,  # Sales
                is_active=True,
                agent_status=AgentStatus.AVAILABLE
            ),
            # Billing agents
            User(
                username="frank_billing",
                email="frank@customerbot.com",
                hashed_password=get_password_hash("password123"),
                full_name="Frank Miller",
                role=UserRole.AGENT,
                department_id=departments[3].id,  # Billing
                is_active=True,
                agent_status=AgentStatus.AVAILABLE
            )
        ]

        for agent in agents:
            session.add(agent)

        await session.commit()

        print("✓ Sample data created successfully!")
        print("\nDepartments created:")
        for dept in departments:
            print(f"  - {dept.name} (ID: {dept.id})")

        print("\nUsers created:")
        print(f"  - Admin: username='admin', password='password'")
        for agent in agents:
            print(f"  - {agent.full_name}: username='{agent.username}', password='password123'")


async def main():
    print("Initializing database...")
    await init_db()
    print("✓ Database tables created!")

    print("\nCreating sample data...")
    await create_sample_data()

    print("\n✓ Database initialization complete!")
    print("\nYou can now start the server with:")
    print("  cd backend")
    print("  python -m uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(main())
