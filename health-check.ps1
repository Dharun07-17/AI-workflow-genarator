Write-Host "=== System Health Check ===" -ForegroundColor Cyan

# 1. Backend
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
  Write-Host "✅ Backend: OK" -ForegroundColor Green
} catch {
  Write-Host "❌ Backend: DOWN" -ForegroundColor Red
}

# 2. Ollama
try {
  $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET
  Write-Host "✅ Ollama: OK ($($models.models.Count) models)" -ForegroundColor Green
} catch {
  Write-Host "❌ Ollama: DOWN" -ForegroundColor Red
}

# 3. Test workflow
try {
  $result = Invoke-RestMethod `
    -Uri "http://localhost:3001/api/workflow/run" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"prompt":"What is 2+2?"}'
  
  Write-Host "✅ Workflow: OK ($($result.results.Count) steps)" -ForegroundColor Green
} catch {
  Write-Host "❌ Workflow: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
