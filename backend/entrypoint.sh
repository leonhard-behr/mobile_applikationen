#!/bin/sh
set -e

python wait_for_db.py

echo "Running migrations..."
alembic upgrade head

echo "Starting gunicorn server..."
exec gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:6000
