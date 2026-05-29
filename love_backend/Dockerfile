# Production image for the Django API (love_backend).
# Build context MUST be the love_backend/ directory:
#   docker build -t love-api love_backend/
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# Build deps for psycopg2 / Pillow / matplotlib on slim (no compilers by default).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Collect static at build time -> immutable image, fast cold start.
# SECRET_KEY has a fallback in settings, so no real secrets are needed here.
RUN python manage.py collectstatic --noinput

# Run as non-root.
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/ || exit 1

# Single-task skeleton: migrate then serve. When you scale past ONE task,
# move `migrate` to a one-off ECS task to avoid concurrent migrations.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 60 --access-logfile -"]
