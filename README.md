# Sistema-de-Gestion-de-Clientes
Proyecto de la materia Administracion de Recursos
# SGI – Sistema de Gestión de Clientes

## Requisitos
- Python 3.12+ y Node 20+
- *Opcional PDF:* wkhtmltopdf instalado (Windows: `wkhtmltopdf-0.12.x`)

## Backend (Django + SQLite)
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# DB local limpia
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
Frontend (Vite + React)
bash
Copy code
cd frontend
npm install
# Configurar .env a partir de .env.example si hace falta
npm run dev
