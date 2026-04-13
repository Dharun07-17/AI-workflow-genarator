Start-Process powershell -ArgumentList "-NoExit", "-Command", `
"cd backend; npm install; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", `
"cd frontend; npm install; npm run dev"
