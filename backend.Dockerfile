FROM --platform=linux/amd64 python:3.12-slim

# Install system dependencies required by OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies into a virtual environment
RUN uv sync --frozen

# Copy only the backend and its required assets (ignoring root Python scripts)
COPY backend/ ./backend/
COPY reference/ ./reference/
COPY *.task ./

EXPOSE 8000

# Start Uvicorn via uv run
CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
