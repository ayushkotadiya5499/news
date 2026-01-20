#!/bin/bash

# AI News Intelligence Backend - Setup Script

echo "🔧 Setting up AI News Intelligence Backend..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running on localhost:5432"
echo "2. Make sure Redis is running on localhost:6379"
echo "3. Create database: createdb ai_news_db (or use PostgreSQL client)"
echo "4. Edit .env file with your configuration"
echo "5. Run: ./run.sh to start the backend"
echo ""
echo "Optional: To run Celery worker:"
echo "   source venv/bin/activate"
echo "   celery -A app.workers.celery_worker worker --loglevel=info"
