# start-all.ps1 - Orchestrates the FinPilot AI project

Write-Host "Starting FinPilot AI Project..." -ForegroundColor Cyan

# 1. Start MongoDB (if Docker was available, we'd do docker-compose up -d)
# Since docker is not detected, we assume MongoDB is running locally on port 27017 or you will need to start it.
Write-Host "Please ensure MongoDB is running on localhost:27017" -ForegroundColor Yellow

# 2. Start ML Service (Python FastAPI)
Write-Host "Starting ML Service on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'apps\ml-service'; .\venv\Scripts\Activate.ps1; python main.py" -WindowStyle Normal

# 3. Start Backend (Node.js Express)
Write-Host "Starting Backend Service on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'apps\backend'; npm run dev" -WindowStyle Normal

# 4. Start Frontend (SvelteKit)
Write-Host "Starting Frontend (SvelteKit) on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'apps\frontend'; npm run dev" -WindowStyle Normal

Write-Host "All services have been launched in separate windows!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend API: http://localhost:5000"
Write-Host "ML Service API: http://localhost:8000"
