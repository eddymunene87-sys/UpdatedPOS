# POS System

A server-rendered Django point-of-sale application for product catalogue, stock receiving, sales, repair tickets, reporting, and user management.

## Run locally

```powershell
Set-Location backend
..\.venv\Scripts\python manage.py migrate
..\.venv\Scripts\python manage.py runserver
```

Open `http://127.0.0.1:8000/`. The default local database is `backend/db.sqlite3`; production database settings are supplied through `DB_ENGINE` and `DB_*` environment variables.

See [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) for the system map, API ownership, and known limitations.
