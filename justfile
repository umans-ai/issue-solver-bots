#!/usr/bin/env just --justfile

# ==============================================================================
# E2E Development Environment
# ==============================================================================
#
# This justfile orchestrates end-to-end development across conversational-ui
# and issue-solver with shared S3 storage (MinIO).
#
# Quick start:
#   just e2e-dev      # Start everything in background
#   just e2e-logs     # Tail all logs
#   just e2e-stop     # Stop everything
#
# Architecture:
#   - Shared MinIO (port 9000): Both projects read/write wiki content here
#   - Shared LocalStack (port 4566): SQS for issue-solver events
#   - Separate Postgres: UI (5432), Backend (55432)
#   - Separate Redis: UI (6379), Backend (63799)
# ==============================================================================

# Directory paths (absolute for reliability)
root_dir := justfile_directory()
ui_dir := root_dir / "conversational-ui"
backend_dir := root_dir / "issue-solver"
logs_dir := root_dir / ".e2e-logs"

# 🔧 E2E shared services (MinIO + LocalStack)
e2e-services:
    @echo "🚀 Starting E2E shared services (MinIO + LocalStack)..."
    @docker-compose -f docker-compose.e2e.yml up -d
    @echo "⏳ Waiting for services to be ready..."
    @sleep 5
    @echo "✅ E2E services ready!"
    @echo "   MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
    @echo "   S3 Endpoint:   http://localhost:9000"
    @echo "   SQS Endpoint:  http://localhost:4566"

# 🛑 Stop E2E shared services
e2e-services-stop:
    @echo "🛑 Stopping E2E shared services..."
    @docker-compose -f docker-compose.e2e.yml down

# ❌ Destroy E2E shared services (including volumes)
e2e-services-destroy:
    @echo "❌ Destroying E2E shared services and data..."
    @docker-compose -f docker-compose.e2e.yml down -v

# 📦 Start project-specific databases (Postgres + Redis for each)
e2e-databases:
    @echo "📦 Starting project databases..."
    @cd {{ui_dir}} && docker-compose up -d postgres redis
    @cd {{backend_dir}} && docker-compose up -d postgres redis
    @echo "✅ Databases ready!"

# 🛑 Stop project-specific databases
e2e-databases-stop:
    @echo "🛑 Stopping project databases..."
    @cd {{ui_dir}} && docker-compose stop postgres redis
    @cd {{backend_dir}} && docker-compose stop postgres redis

# 📁 Create logs directory
[private]
e2e-logs-init:
    @mkdir -p "{{logs_dir}}"

# ▶️ Start conversational-ui in background (uses shared MinIO on port 9000)
[private]
e2e-start-ui: e2e-logs-init
    @echo "▶️  Starting conversational-ui..."
    @echo "   Waiting for UI database..."
    @until docker exec postgres-umansuidb pg_isready -U user -d umansuidb > /dev/null 2>&1; do sleep 1; done
    @echo "   Running migrations..."
    @cd "{{ui_dir}}" && pnpm run db:migrate > /dev/null 2>&1
    @echo "   Starting Next.js..."
    @cd "{{ui_dir}}" && \
        BLOB_ENDPOINT=http://localhost:9000 \
        BLOB_ACCESS_KEY_ID=minioadmin \
        BLOB_SECRET_ACCESS_KEY=minioadmin \
        BLOB_BUCKET_NAME=conversational-ui-blob \
        nohup pnpm run dev > "{{logs_dir}}/ui.log" 2>&1 & \
        echo $! > "{{logs_dir}}/ui.pid"
    @echo "   PID: $(cat "{{logs_dir}}/ui.pid")"
    @echo "   Log: {{logs_dir}}/ui.log"

# ▶️ Start issue-solver API in background (with MinIO for S3, skip LocalStack - using shared)
[private]
e2e-start-api: e2e-logs-init
    @echo "▶️  Starting issue-solver API..."
    @echo "   Waiting for backend database..."
    @until docker exec postgres-umansbackenddb pg_isready -U cudu -d umansbackenddb > /dev/null 2>&1; do sleep 1; done
    @echo "   Running migrations..."
    @cd "{{backend_dir}}" && just db-upgrade
    @echo "   Starting FastAPI..."
    @cd "{{backend_dir}}" && \
        AWS_ENDPOINT_URL_S3=http://localhost:9000 \
        AWS_ENDPOINT_URL_SQS=http://localhost:4566 \
        AWS_ACCESS_KEY_ID=minioadmin \
        AWS_SECRET_ACCESS_KEY=minioadmin \
        KNOWLEDGE_BUCKET_NAME=conversational-ui-blob \
        nohup just api-start > "{{logs_dir}}/api.log" 2>&1 & \
        echo $! > "{{logs_dir}}/api.pid"
    @echo "   PID: $(cat "{{logs_dir}}/api.pid")"
    @echo "   Log: {{logs_dir}}/api.log"

# ▶️ Start issue-solver worker in background (with MinIO for S3, shared LocalStack for SQS)
[private]
e2e-start-worker: e2e-logs-init
    @echo "▶️  Starting issue-solver worker..."
    @cd "{{backend_dir}}" && \
        AWS_ENDPOINT_URL_S3=http://localhost:9000 \
        AWS_ENDPOINT_URL_SQS=http://localhost:4566 \
        AWS_ACCESS_KEY_ID=minioadmin \
        AWS_SECRET_ACCESS_KEY=minioadmin \
        KNOWLEDGE_BUCKET_NAME=conversational-ui-blob \
        nohup just w > "{{logs_dir}}/worker.log" 2>&1 & \
        echo $! > "{{logs_dir}}/worker.pid"
    @echo "   PID: $(cat "{{logs_dir}}/worker.pid")"
    @echo "   Log: {{logs_dir}}/worker.log"

# 🚀 Start full E2E environment (everything in background)
e2e-dev: e2e-services e2e-databases e2e-start-ui e2e-start-api e2e-start-worker
    @echo ""
    @echo "=============================================="
    @echo "🎉 E2E environment is running!"
    @echo "=============================================="
    @echo ""
    @echo "Services:"
    @echo "  UI:      http://localhost:3000"
    @echo "  API:     http://localhost:8000"
    @echo "  MinIO:   http://localhost:9001 (console)"
    @echo ""
    @echo "Logs:"
    @echo "  just e2e-logs          # All logs"
    @echo "  just e2e-logs-ui       # UI only"
    @echo "  just e2e-logs-api      # API only"
    @echo "  just e2e-logs-worker   # Worker only"
    @echo ""
    @echo "Stop:"
    @echo "  just e2e-stop          # Stop all"
    @echo ""

# 📋 Show all logs (tail -f)
e2e-logs:
    @tail -f {{logs_dir}}/*.log

# 📋 Show UI logs
e2e-logs-ui:
    @tail -f {{logs_dir}}/ui.log

# 📋 Show API logs
e2e-logs-api:
    @tail -f {{logs_dir}}/api.log

# 📋 Show worker logs
e2e-logs-worker:
    @tail -f {{logs_dir}}/worker.log

# 🔍 Show E2E status
e2e-status:
    @echo "📊 E2E Status"
    @echo "============="
    @echo ""
    @echo "Shared Services:"
    @docker-compose -f docker-compose.e2e.yml ps 2>/dev/null || echo "  Not running"
    @echo ""
    @echo "UI Database:"
    @cd {{ui_dir}} && docker-compose ps postgres redis 2>/dev/null || echo "  Not running"
    @echo ""
    @echo "Backend Database:"
    @cd {{backend_dir}} && docker-compose ps postgres redis 2>/dev/null || echo "  Not running"
    @echo ""
    @echo "Application PIDs:"
    @if [ -f {{logs_dir}}/ui.pid ]; then echo "  UI:     $(cat {{logs_dir}}/ui.pid) ($(ps -p $(cat {{logs_dir}}/ui.pid) -o comm= 2>/dev/null || echo 'stopped'))"; else echo "  UI:     not started"; fi
    @if [ -f {{logs_dir}}/api.pid ]; then echo "  API:    $(cat {{logs_dir}}/api.pid) ($(ps -p $(cat {{logs_dir}}/api.pid) -o comm= 2>/dev/null || echo 'stopped'))"; else echo "  API:    not started"; fi
    @if [ -f {{logs_dir}}/worker.pid ]; then echo "  Worker: $(cat {{logs_dir}}/worker.pid) ($(ps -p $(cat {{logs_dir}}/worker.pid) -o comm= 2>/dev/null || echo 'stopped'))"; else echo "  Worker: not started"; fi

# 🛑 Stop all E2E processes
e2e-stop:
    @echo "🛑 Stopping E2E environment..."
    @echo ""
    @echo "Stopping applications..."
    @if [ -f {{logs_dir}}/ui.pid ]; then kill $(cat {{logs_dir}}/ui.pid) 2>/dev/null || true; rm {{logs_dir}}/ui.pid; echo "  UI stopped"; fi
    @if [ -f {{logs_dir}}/api.pid ]; then kill $(cat {{logs_dir}}/api.pid) 2>/dev/null || true; rm {{logs_dir}}/api.pid; echo "  API stopped"; fi
    @if [ -f {{logs_dir}}/worker.pid ]; then kill $(cat {{logs_dir}}/worker.pid) 2>/dev/null || true; rm {{logs_dir}}/worker.pid; echo "  Worker stopped"; fi
    @echo ""
    @echo "Stopping databases..."
    @cd {{ui_dir}} && docker-compose stop postgres redis 2>/dev/null || true
    @cd {{backend_dir}} && docker-compose stop postgres redis 2>/dev/null || true
    @echo ""
    @echo "Stopping shared services..."
    @docker-compose -f docker-compose.e2e.yml down
    @echo ""
    @echo "✅ E2E environment stopped"

# 🧹 Clean E2E environment (stop + remove logs)
e2e-clean: e2e-stop
    @echo "🧹 Cleaning E2E logs..."
    @rm -rf {{logs_dir}}
    @echo "✅ E2E environment cleaned"

# ❌ Destroy E2E environment (clean + remove volumes)
e2e-destroy: e2e-clean
    @echo "❌ Destroying E2E data volumes..."
    @cd {{ui_dir}} && docker-compose down -v 2>/dev/null || true
    @cd {{backend_dir}} && docker-compose down -v 2>/dev/null || true
    @docker-compose -f docker-compose.e2e.yml down -v 2>/dev/null || true
    @echo "✅ E2E environment destroyed"

# 🌱 Seed test user for UI (for Playwright/E2E testing)
e2e-seed-test:
    @cd {{ui_dir}} && just seed-test
