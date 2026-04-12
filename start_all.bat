@echo off
echo Starting the MERN Project!
echo ===============================
echo Starting Express Backend on port 5000...
start cmd /k "cd backend && npm run dev"

echo Starting React Vite Frontend...
start cmd /k "cd frontend && npm run dev"

echo Done! The servers are now running.
