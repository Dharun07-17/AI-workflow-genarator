# Flowberry

Flowberry is an event-driven AI workflow automation platform where agent **Fizz** converts one natural-language command into an executable multi-step workflow. Steps are queued in RabbitMQ and executed by separate workers with retries, DLQ, idempotency keys, and full execution traceability.

## Project Structure

```text
flowberry/
  backend/
    app/
      auth/
      controllers/
      core/
      events/
      middleware/
      models/
      observability/
      repositories/
      schemas/
      services/
      utils/
      workers/
    alembic/
  frontend/
    src/
      components/
      hooks/
      layouts/
      pages/
      services/
      store/
      types/
  infra/
    grafana/
    loki/
    otel/
    prometheus/
  docs/diagrams/
  docker-compose.yml
  .env.example
```

## Architecture Explanation

- **Style**: Event-driven distributed architecture.
- **API Thread Rule**: API creates plan + persists + publishes jobs; it does not execute long-running tasks.
- **Patterns used**:
  - MVC (controllers + schemas/views + model domain)
  - Singleton DB manager (`DatabaseManager`)
  - Observer pattern (`WorkflowObserver`)
  - Repository pattern (`UserRepository`, `WorkflowRepository`, `LogRepository`, `JobRepository`, `IntegrationRepository`)
  - Service layer (`FizzPlanningService`, `WorkflowExecutionService`, `QueuePublisherService`, `NotificationService`)

## Backend Implementation

- **Framework**: FastAPI + SQLAlchemy + Pydantic.
- **Controllers**:
  - `AuthController`: login, MFA verify, refresh, me.
  - `WorkflowController`: create/get/steps/logs/retry.
  - `AdminController`: admin workflow listing.
  - `IntegrationsController`: manage API/OAuth credentials (encrypted).
- **Security**:
  - JWT access tokens, refresh token rotation, TOTP flow.
  - RBAC (`user`, `admin`).
- **PII handling**:
  - `EncryptionService` encrypts sensitive values with Fernet before storing.
  - Lookup uses hash fields (email hash), and responses/logs are sanitized.

## Frontend Implementation

- **Stack**: React + TypeScript + Tailwind + React Query + Zustand + Axios.
- **Pages**:
  - Login
  - MFA Verify
  - Workflow Submission
  - Workflow Detail
  - Workflow Logs
  - Integrations
  - Admin Dashboard
- **Capabilities**:
  - Submit natural-language workflow prompts
  - Poll workflow status/steps/logs
  - Manage OAuth / API key integrations with password-confirmed delete
  - Role-aware admin page

## Workers and Queueing

- **Broker**: RabbitMQ.
- **Queues**:
  - `workflow-planning`, `csv-analysis`, `report-generation`, `email-send`, `calendar-create`, `notifications`
- **Workers**:
  - `worker-email`: `report-generation`, `email-send`
  - `worker-calendar`: `calendar-create`, `notifications`, `csv-analysis`
- **Idempotency**:
  - Key strategy: `workflow_id:step_id`
  - Consumer checks DB before execution and skips duplicates.
- **Retry + DLQ**:
  - Retries increment on failure up to max retry count.
  - Final failures are moved to `<queue>-dlq`.

## Database Schema

Required domain models are implemented:
- `User`
- `RefreshToken`
- `Workflow`
- `WorkflowStep`
- `Job`
- `ExecutionLog`
- `Integration`

See ER diagram: `docs/diagrams/er.md`.

## Security

- Access token TTL: 15 minutes.
- Refresh token rotation and secure hashing in DB.
- MFA endpoint: `POST /api/v1/auth/mfa/verify`.
- Login endpoint rate-limited via middleware.
- Log sanitizer masks basic email/phone patterns.
- API responses avoid exposing encrypted raw PII values.

## Observability

- Prometheus metrics endpoint: `/metrics`
- Loki for logs
- Grafana for dashboards
- OpenTelemetry tracing export via OTLP (`otel-collector`)

## API Contract

Base path: `/api/v1`

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/mfa/verify`
- `POST /workflows`
- `GET /workflows/{id}`
- `GET /workflows/{id}/logs`
- `GET /workflows/{id}/steps`
- `POST /workflows/{id}/retry`
- `GET /admin/workflows`
- `GET /integrations`
- `POST /integrations`
- `DELETE /integrations/{id}`

Success format:

```json
{
  "success": true,
  "data": {},
  "message": "Workflow created"
}
```

Error format:

```json
{
  "success": false,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow does not exist"
  }
}
```

## Docker Compose

All required services are included in `docker-compose.yml`:
- `frontend`
- `api`
- `worker-email`
- `worker-calendar`
- `postgres`
- `rabbitmq`
- `prometheus`
- `loki`
- `grafana`
- `otel-collector`

Single shared network: `flowberry-net`.

## Diagrams

- System architecture: `docs/diagrams/system-architecture.md`
- Sequence diagram: `docs/diagrams/sequence.md`
- ER diagram: `docs/diagrams/er.md`

## Setup and Run

1. Copy env:

```bash
cp .env.example .env
```

2. Generate Fernet key (Python):

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

3. Put values in `.env`:
- `JWT_SECRET`
- `FERNET_KEY`

4. Start stack:

```bash
docker compose up --build
```

5. Initialize DB + seed admin (optional helper inside API container):

```bash
docker compose exec api python -m app.core.bootstrap
```

6. Access:
- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- RabbitMQ UI: `http://localhost:15672`
- Grafana: `http://localhost:3000`

## Example JWT Auth Flow

1. `POST /api/v1/auth/login`
2. If MFA required, receive `mfa_token`
3. `POST /api/v1/auth/mfa/verify`
4. Receive access + refresh token
5. Use access token in `Authorization: Bearer <token>`
6. Rotate via `POST /api/v1/auth/refresh`

## Example Encrypted PII Model

`User.email_encrypted`, `User.phone_encrypted`, `User.name_encrypted` are encrypted with Fernet.
`User.email_hash` is used for indexed lookup and never decrypted for search.

## Example RabbitMQ Producer / Consumer

- Producer: `app/services/queue_publisher_service.py`
- Consumers:
  - `app/workers/email_worker.py`
  - `app/workers/calendar_worker.py`
- Shared retry/idempotency/DLQ logic: `app/workers/consumer_base.py`

## Notes

This scaffold is production-oriented but still a starter implementation. Replace placeholder integrations (actual Gmail/Calendar/Gemini/OpenAI calls) in worker task handlers as needed.
