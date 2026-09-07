# POS System Architecture Reference

## Current architecture

```text
Browser
  Django-rendered pages (backend/templates/*.html)
    assets/js/script.js       session-aware fetch + CSRF header
    page module               products, inventory, sales, repairs, reports,
                              categories, account, or users
             |
             v
Django (backend/)
  pos_backend/urls.py        page, asset, authentication, and API routes
  accounts/                  custom User, login/logout, user/account API
  pos_api/                   catalogue, inventory, stock, sales, repairs API
             |
             v
Database
  SQLite locally; PostgreSQL when configured through environment variables
```

The database is the source of truth. Page modules call same-origin `/api/` endpoints through `window.posApiFetch`; Django session authentication and CSRF protect those calls. `store.js` is a legacy localStorage utility and is not loaded by the canonical Django templates.

## Responsibilities and data flow

| Area | Owner | Important flow |
| --- | --- | --- |
| Authentication and accounts | `accounts` | Django session login; `/api/users/me/` supplies the signed-in profile. |
| Catalogue | `pos_api.Category`, `Product` | Product creation atomically creates its one-to-one `Inventory` row. |
| Stock receiving and corrections | `StockEntryViewSet`, `StockAdjustmentViewSet` | A stock-entry POST records received stock; manual corrections record the actor, reason, before/after quantities, and update inventory atomically. |
| Selling | `SaleViewSet` | A sale locks inventory rows, validates available stock, snapshots prices, decrements stock, and records the cashier and payment reference in one transaction. |
| Repairs | `RepairViewSet` | Creates a generated ticket, records completion time on completion, and archives rather than destroys removed tickets. |
| Reporting/dashboard | browser modules | Read sales and product API data and calculate display-only aggregates. |

## Routes

| Route | Purpose |
| --- | --- |
| `/accounts/login/`, `/accounts/logout/` | Session authentication |
| `/*.html` | Authenticated POS pages; `users.html` also requires manager/superuser |
| `/assets/...` | CSS and JavaScript served from the shared assets directory |
| `/api/categories/`, `/api/products/`, `/api/inventory/` | Catalogue and stock state |
| `/api/stock-entries/` | Auditable stock receiving |
| `/api/stock-adjustments/` | Auditable manual inventory corrections |
| `/api/sales/` | Sales creation and history |
| `/api/repairs/` | Repair tickets |
| `/api/users/`, `/api/users/me/` | Managed cashiers and the current account |

## Wiring checks and limitations

The following were corrected in this revision:

- Local development now defaults to the SQLite database that ships with the project; PostgreSQL remains an explicit deployment choice.
- The dashboard now renders all five declared charts, including hourly revenue and inventory status.
- The dependency list no longer has two competing Django requirements.
- Automated API tests now verify stock receipt, successful sales, and insufficient-stock rollback behavior.

Keep these constraints in mind when extending the system:

- The root-level HTML files are legacy static copies. Django serves `backend/templates/` as the canonical UI; edit those templates and `assets/` together.
- `assets/js/store.js` is legacy code. Do not use it for business data, otherwise it will diverge from the database.
- Inventory quantities are changed through stock entries, sales, or stock adjustments. Use the adjustment endpoint whenever a manual correction is required so the reason and before/after values are retained.
- Catalogue, inventory, and repairs use authenticated access rather than fine-grained role permissions. If cashiers must be restricted from changing those resources, add object/action permissions on the API—not only hidden navigation controls.
- Reports are client-side aggregates over loaded records. Add server-side filtered/report endpoints before the data set becomes large.
- Set a non-default `SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, and PostgreSQL credentials before production deployment.

## Verification

```powershell
Set-Location backend
$env:DB_ENGINE = 'django.db.backends.sqlite3' # use SQLite for isolated local tests
..\.venv\Scripts\python manage.py check
..\.venv\Scripts\python manage.py test
```
