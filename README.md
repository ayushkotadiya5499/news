# AI News Intelligence Backend

A modern FastAPI backend for aggregating, summarizing, and managing news articles with AI-powered features.

## Features

- 🔐 JWT-based authentication with role-based access control
- 📰 News article aggregation from multiple sources
- 🤖 AI-powered text summarization
- 🔍 Advanced search and filtering
- 📊 Admin dashboard for content management
- 🔄 Background task processing with Celery
- 💾 PostgreSQL database with SQLAlchemy ORM
- ⚡ Redis caching

## Prerequisites

Before running the backend, ensure you have the following installed:

- Python 3.8 or higher
- PostgreSQL (running on localhost:5432)
- Redis (running on localhost:6379)

### Installing Prerequisites on Ubuntu/Debian:

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server
sudo systemctl enable postgresql
sudo systemctl enable redis-server
```

### Create Database:

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE ai_news_db;

# Create user (optional)
CREATE USER ai_news_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_news_db TO ai_news_user;

# Exit
\q
```

## Quick Start

### 1. Setup (First Time Only)

```bash
# Run the setup script
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Create a `.env` file from `.env.example`

### 2. Configure Environment

Edit the `.env` file with your configuration:

```bash
nano .env
```

Key settings to configure:
- `DATABASE_URL`: PostgreSQL connection string
- `NEWS_API_KEY`: Get a free API key from https://newsapi.org/
- `SECRET_KEY`: Change to a secure random string

### 3. Run the Backend

```bash
# Start the FastAPI server
./run.sh
```

The backend will be available at: http://localhost:8000

### 4. Test the Backend

In a new terminal:

```bash
# Run the test script
./test.sh
```

## Manual Setup (Alternative)

If you prefer to set up manually:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Celery Worker (Optional)

For background task processing:

```bash
# In a new terminal, activate the virtual environment
source venv/bin/activate

# Run Celery worker
celery -A app.workers.celery_worker worker --loglevel=info
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Default Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change these credentials in production!

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /auth/me` - Get current user profile

### News
- `GET /news/articles` - Get all articles (paginated)
- `POST /news/articles` - Create a new article (admin only)
- `GET /news/articles/{id}` - Get article by ID
- `PUT /news/articles/{id}` - Update article (admin only)
- `DELETE /news/articles/{id}` - Delete article (admin only)

### Search
- `GET /search/` - Search articles by keyword
- `GET /search/advanced` - Advanced search with filters

### Admin
- `GET /admin/users` - Get all users
- `PUT /admin/users/{id}` - Update user
- `DELETE /admin/users/{id}` - Delete user

## Project Structure

```
ai_news_intelligence_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── api/                    # API routes
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── news.py            # News endpoints
│   │   ├── search.py          # Search endpoints
│   │   └── admin.py           # Admin endpoints
│   ├── core/                   # Core functionality
│   │   ├── config.py          # Configuration settings
│   │   └── security.py        # Security utilities
│   ├── db/                     # Database
│   │   ├── models.py          # SQLAlchemy models
│   │   └── session.py         # Database session
│   ├── services/               # Business logic
│   │   ├── news_client.py     # News API client
│   │   └── summarizer.py      # Text summarization
│   └── workers/                # Background tasks
│       └── celery_worker.py   # Celery configuration
├── .env.example                # Environment variables template
├── requirements.txt            # Python dependencies
├── setup.sh                    # Setup script
├── run.sh                      # Run script
└── test.sh                     # Test script
```

## Development

### Activate Virtual Environment

```bash
source venv/bin/activate
```

### Install New Dependencies

```bash
pip install package_name
pip freeze > requirements.txt
```

### Database Migrations (if using Alembic)

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create a migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Redis Connection Issues

```bash
# Check if Redis is running
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping
```

### Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill the process
kill -9 <PID>
```

## License

MIT License

## Support

For issues and questions, please open an issue on the repository.
