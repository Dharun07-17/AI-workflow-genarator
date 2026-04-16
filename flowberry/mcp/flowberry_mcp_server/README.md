# Flowberry MCP Server (stdio)

This is a local MCP server that exposes Flowberry workflow operations as MCP tools by calling the existing Flowberry API.

## Prereqs

- Flowberry API running locally (default): `http://localhost:8000/api/v1`
- Python available on this machine

Note (Windows): in this repo, `python` may resolve to a WindowsApps stub. Use the real interpreter, e.g.:

```powershell
C:\Users\jeeva\AppData\Local\Python\pythoncore-3.14-64\python.exe --version
```

## Install deps

```powershell
cd mcp\flowberry_mcp_server
pip install -r requirements.txt
```

If you’re using MCP Inspector and env var passing is flaky, install this server into the venv (recommended):

```powershell
cd mcp\flowberry_mcp_server
pip install -e .
```

If you see a `starlette` / `fastapi` dependency conflict, use a virtualenv (recommended):

```powershell
cd mcp\flowberry_mcp_server
C:\Users\jeeva\AppData\Local\Python\pythoncore-3.14-64\python.exe -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run (stdio)

### Recommended: run as a module (no script path issues)

Run as a module:

```powershell
python -u -m flowberry_mcp_server
```

### Option A: Provide a bearer token (recommended if MFA is enabled)

```powershell
$env:FLOWBERRY_API_BASE_URL="http://localhost:8000/api/v1"
$env:FLOWBERRY_ACCESS_TOKEN="...paste access token..."
python -u -m flowberry_mcp_server
```

### Option B: Email/password login (may require MFA)

```powershell
$env:FLOWBERRY_API_BASE_URL="http://localhost:8000/api/v1"
$env:FLOWBERRY_EMAIL="admin@flowberry.local"
$env:FLOWBERRY_PASSWORD="Admin123!"
python -u -m flowberry_mcp_server
```

If MFA is enabled, use MCP tools in this order:

1. `auth_login`
2. `auth_mfa_request` (sends OTP via Gmail integration)
3. `auth_mfa_verify`

## Claude Desktop config (example)

Set the MCP server command to your Python interpreter and point args at `server.py`. Provide env vars as needed:

- `FLOWBERRY_API_BASE_URL`
- Either `FLOWBERRY_ACCESS_TOKEN` or `FLOWBERRY_EMAIL`/`FLOWBERRY_PASSWORD`

## Useful Tools

- `health`: verifies the API is up (no auth)
- `check_ai_connectivity`: checks Gemini/Ollama reachability from the API (admin-only)
- `create_workflow_and_wait`: creates a workflow and polls until completion/failure
- `get_final_summary`: returns the final summarized report text for a workflow
