FROM --platform=linux/amd64 ghcr.io/astral-sh/uv:latest AS uv_image
FROM --platform=linux/amd64 python:3.12-slim

# Install system dependencies required by OpenCV and FFmpeg video decoding
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

# Install uv for fast dependency management
COPY --from=uv_image /uv /bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies into a virtual environment
RUN uv sync --frozen

# Copy only the backend and its required assets (ignoring root Python scripts)
COPY backend/ ./backend/
COPY reference/ ./reference/
COPY *.task ./

EXPOSE 8000

# Start Uvicorn directly from the virtual environment (bypassing uv run at runtime)
CMD ["/app/.venv/bin/uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

