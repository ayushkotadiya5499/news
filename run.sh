#!/bin/bash
set -euo pipefail

# AI News Intelligence Backend - Run Script

echo "Starting AI News Intelligence Backend..."

# Config toggles (override when needed)
: "${START_REDIS:=true}"
: "${START_CELERY_WORKER:=true}"
: "${START_CELERY_BEAT:=true}"

PID_DIR=".pids"
mkdir -p "$PID_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
  echo "Virtual environment not found. Please run setup.sh first."
  exit 1
fi

# If venv exists but is missing activation scripts/pip, repair it.
if [ ! -f "venv/bin/activate" ]; then
  echo "Detected an incomplete virtual environment (venv/bin/activate missing). Repairing venv..."
  if ! python3 -m venv venv; then
    echo ""
    echo "ERROR: Could not create/repair the virtual environment." 
    echo "On Debian/Ubuntu you likely need to install the venv package:" 
    echo "  sudo apt update"
    echo "  sudo apt install -y python3-venv"
    echo "If your system Python is 3.10 specifically, you may need:" 
    echo "  sudo apt install -y python3.10-venv"
    echo ""
    echo "Then recreate the venv and re-run:" 
    echo "  rm -rf venv"
    echo "  ./setup.sh"
    exit 1
  fi
fi

# Activate virtual environment
# shellcheck disable=SC1091
source venv/bin/activate

# Ensure pip exists in the venv (some environments can create venv without pip).
if ! command -v pip >/dev/null 2>&1; then
  echo "pip not found in venv. Bootstrapping pip..."
  python -m ensurepip --upgrade
  python -m pip install --upgrade pip
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo ".env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "Please edit .env file with your configuration"
fi

is_pid_running() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file" || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

start_redis() {
  if [ "$START_REDIS" != "true" ]; then
    return 0
  fi

  # Fast check: is Redis answering?
  if redis-cli ping >/dev/null 2>&1; then
    echo "Redis is running."
    return 0
  fi

  echo "Redis not detected. Attempting to start Redis..."

  # Try systemd first (no prompt). If it fails, fall back to instructions.
  if command -v systemctl >/dev/null 2>&1; then
    if sudo -n true >/dev/null 2>&1; then
      sudo -n systemctl start redis-server || true
      sleep 0.5
      if redis-cli ping >/dev/null 2>&1; then
        echo "Redis started via systemctl."
        return 0
      fi
    else
      echo "No passwordless sudo available; cannot auto-start Redis via systemctl."
    fi
  fi

  # Try launching redis-server directly (non-systemd installs)
  if command -v redis-server >/dev/null 2>&1; then
    # Try daemonize if supported
    redis-server --daemonize yes >/dev/null 2>&1 || true
    sleep 0.5
    if redis-cli ping >/dev/null 2>&1; then
      echo "Redis started via redis-server."
      return 0
    fi
  fi

  echo "ERROR: Redis is required for Celery but is not running."
  echo "Start it manually in another terminal:"
  echo "  sudo systemctl start redis-server"
  echo "or:"
  echo "  redis-server"
  exit 1
}

start_celery_worker() {
  if [ "$START_CELERY_WORKER" != "true" ]; then
    return 0
  fi

  local pid_file="$PID_DIR/celery-worker.pid"
  if is_pid_running "$pid_file"; then
    echo "Celery worker already running (pid $(cat "$pid_file"))."
    return 0
  fi

  echo "Starting Celery worker..."
  celery -A app.workers.celery_worker worker --loglevel=info \
    --logfile celery-worker.log &
  echo $! > "$pid_file"
}

start_celery_beat() {
  if [ "$START_CELERY_BEAT" != "true" ]; then
    return 0
  fi

  local pid_file="$PID_DIR/celery-beat.pid"
  if is_pid_running "$pid_file"; then
    echo "Celery beat already running (pid $(cat "$pid_file"))."
    return 0
  fi

  echo "Starting Celery beat..."
  celery -A app.workers.celery_worker beat --loglevel=info \
    --logfile celery-beat.log &
  echo $! > "$pid_file"
}

cleanup() {
  echo ""
  echo "Stopping background processes..."

  for f in "$PID_DIR"/celery-*.pid; do
    [ -f "$f" ] || continue
    pid="$(cat "$f" || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$f"
  done

  echo "Done."
}

trap cleanup EXIT INT TERM

start_redis
start_celery_worker
start_celery_beat

echo "Starting FastAPI server on http://localhost:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload