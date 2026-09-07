# POS System - Technical Architecture & Integration Guide

## 🏗️ Current vs. Target Architecture

### Current State
```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HTML Pages (dashboard, sales, products, etc.)       │   │
│  │  ├─ assets/js/products.js ──┐                        │   │
│  │  ├─ assets/js/sales.js      ├──> localStorage       │   │
│  │  ├─ assets/js/inventory.js  │    (Browser Memory)   │   │
│  │  ├─ assets/js/repairs.js   ─┘                        │   │
│  │  └─ assets/js/categories.js                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │ (Unused)                       │
│                              ↓                                │
│                    ❌ Data Lost on Refresh ❌                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Django - Unused APIs)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REST API Endpoints (Built but not called)           │   │
│  │  ├─ /api/products/       ╭──────────────┐            │   │
│  │  ├─ /api/categories/      │              │ ┌──────┐  │   │
│  │  ├─ /api/inventory/       ├─> Database  │ │SQLite│  │   │
│  │  ├─ /api/sales/           │  (Unused)   │ └──────┘  │   │
│  │  ├─ /api/repairs/        ╰──────────────┘            │   │
│  │  └─ /api/users/                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Problem: Data exists in two places with no sync
```

### Target State (After Phase 2)
```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HTML Pages + SPA Framework (optional future)        │   │
│  │  ├─ components/ProductsModule                        │   │
│  │  ├─ components/SalesModule                           │   │
│  │  ├─ components/InventoryModule                       │   │
│  │  ├─ api-client.js ──┐                                │   │
│  │  └─ error-handler.js ├──> Fetch with                │   │
│  │                      │     Error Handling            │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │ (Active)                       │
│                        HTTP/REST API                         │
│                              │                                │
│         ✅ Data Synced Across Sessions ✅                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Django - Active APIs)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REST API Endpoints (Used by Frontend)               │   │
│  │  ├─ /api/products/       ────┐                       │   │
│  │  ├─ /api/categories/     ─┐  │                       │   │
│  │  ├─ /api/inventory/      ─┼──┼──> Serializers       │   │
│  │  ├─ /api/sales/          ─┤  │     ↓                 │   │
│  │  ├─ /api/repairs/        ─┼──┼──> ViewSets          │   │
│  │  ├─ /api/users/          ─┘  │     ↓                 │   │
│  │  └─ /api-auth/                │     Models           │   │
│  │                               │     ↓                 │   │
│  │  ┌──────────────────────────────┐ ┌────────┐         │   │
│  │  │ Middleware & Permissions    │ │Database│         │   │
│  │  │ - CORS                      │ │        │         │   │
│  │  │ - Authentication            │ │ Atomic │         │   │
│  │  │ - Authorization             │ │Txns    │         │   │
│  │  │ - Error Handling            │ └────────┘         │   │
│  │  └──────────────────────────────┘                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Solution: Single source of truth (database)
         Secure API communication
         Persistent data storage
```

---

## 🔄 Data Flow Transformation

### BEFORE: Client-Side Storage (Currently Broken)
```javascript
// assets/js/store.js (CURRENT - LOCAL STORAGE ONLY)
function getProducts() {
    return JSON.parse(localStorage.getItem('pos_products') || '[]');
}

function saveProduct(product) {
    const products = getProducts();
    products.push(product);
    localStorage.setItem('pos_products', JSON.stringify(products));
    return products;
}

// assets/js/products.js
function addProduct() {
    const product = { name, category, quantity, price };
    saveProduct(product);  // ← Saves only to browser
    // ← Data lost on refresh
}
```

### AFTER: Backend-Driven Storage (Phase 2 Target)
```javascript
// assets/js/api-client.js (NEW - CENTRALIZED API)
class APIClient {
    async request(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            credentials: 'same-origin',
            headers: this.getHeaders(options),
            ...options
        });
        
        if (response.status === 401) {
            window.location.href = '/accounts/login/';
        }
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return response.json();
    }
    
    getHeaders(options) {
        const headers = new Headers(options.headers || {});
        if (options.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        if (!['GET', 'HEAD'].includes(options.method)) {
            headers.set('X-CSRFToken', this.getCookie('csrftoken'));
        }
        return headers;
    }
}

// assets/js/products.js (REFACTORED)
const api = new APIClient();

async function addProduct() {
    const productData = { name, category, quantity, price };
    
    try {
        const savedProduct = await api.request('/api/products/', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
        
        showToast(`Product saved: ${savedProduct.name}`);
        refreshProductList();  // Reload from API
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function refreshProductList() {
    const products = await api.request('/api/products/');
    renderProducts(products);  // Display from database
}
```

---

## 🔌 API Integration Pattern (Template)

### Pattern for Each Feature Integration

```
1. BACKEND SETUP (Already Done)
   ├─ Model defined (Product, Category, etc.)
   ├─ Serializer created
   ├─ ViewSet with CRUD operations
   ├─ URL routing configured
   ├─ Permissions checked
   └─ Tested with curl/Postman

2. FRONTEND SETUP (Phase 2 Task)
   ├─ Create new module (e.g., api-products.js)
   ├─ Implement API methods
   │  ├─ list()    → GET /api/products/
   │  ├─ get(id)   → GET /api/products/{id}/
   │  ├─ create()  → POST /api/products/
   │  ├─ update()  → PATCH /api/products/{id}/
   │  └─ delete()  → DELETE /api/products/{id}/
   ├─ Add error handling
   ├─ Add loading states
   ├─ Add retry logic
   └─ Remove localStorage

3. INTEGRATION TEST
   ├─ Create product from UI
   ├─ Verify appears in list
   ├─ Reload page
   ├─ Data persists ✓
   ├─ Edit product
   ├─ Verify changes persist
   └─ Delete product

4. VALIDATION
   ├─ No console errors
   ├─ API responses logged
   ├─ Error messages shown to user
   ├─ Loading spinners display
   └─ Concurrent operations handled
```

---

## 📦 Backend API Structure (Reference)

### Category Endpoint
```python
# backend/pos_api/models.py
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# backend/pos_api/serializers.py
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')

# backend/pos_api/views.py
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (IsAuthenticated,)

# backend/pos_api/urls.py
router.register('categories', CategoryViewSet)

# API Available at:
GET    /api/categories/              # List all
POST   /api/categories/              # Create new
GET    /api/categories/{id}/         # Get one
PATCH  /api/categories/{id}/         # Update
DELETE /api/categories/{id}/         # Delete
```

### Example Request/Response
```bash
# CREATE
curl -X POST http://localhost:8000/api/categories/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <token>" \
  -d '{"name": "Electronics", "description": "Electronic items"}'

# Response 201
{
  "id": 1,
  "name": "Electronics",
  "description": "Electronic items",
  "created_at": "2026-08-31T12:00:00Z"
}

# LIST
curl http://localhost:8000/api/categories/
# Response 200
[
  {"id": 1, "name": "Electronics", ...},
  {"id": 2, "name": "Software", ...}
]

# UPDATE
curl -X PATCH http://localhost:8000/api/categories/1/ \
  -d '{"description": "All electronics"}'
# Response 200 (updated object)

# DELETE
curl -X DELETE http://localhost:8000/api/categories/1/
# Response 204 (No Content)
```

---

## 🛡️ Error Handling Strategy

### Backend (Django)
```python
# backend/pos_api/views.py
from rest_framework.response import Response
from rest_framework import status

class ProductViewSet(viewsets.ModelViewSet):
    def create(self, request):
        try:
            # Validation happens here
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Business logic
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            # Client error - user input invalid
            return Response(
                {'error': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Server error
            logger.error(f"Error creating product: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

### Frontend (JavaScript)
```javascript
// assets/js/api-client.js
async function request(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, options);
        
        // Authentication error
        if (response.status === 401) {
            redirect('/accounts/login/');
            return;
        }
        
        // Permission error
        if (response.status === 403) {
            showToast('You do not have permission', 'error');
            return;
        }
        
        // Not found
        if (response.status === 404) {
            showToast('Resource not found', 'error');
            return;
        }
        
        // Server error
        if (response.status >= 500) {
            showToast('Server error, please try again', 'error');
            logger.error(`Server error: ${response.status}`);
            return;
        }
        
        // Parse response
        const data = await response.json();
        
        // Validation errors (400)
        if (response.status === 400 && data.error) {
            showToast(`Validation: ${data.error}`, 'error');
            return null;
        }
        
        return data;
        
    } catch (networkError) {
        showToast('Network error - check connection', 'error');
        logger.error(`Network error: ${networkError}`);
        return null;
    }
}
```

---

## 🔐 Authentication & Security Flow

### Login Process
```
1. User submits username/password on /accounts/login/
   ↓
2. Django authenticates user
   ├─ Check credentials
   ├─ Create session
   └─ Set sessionid cookie
   ↓
3. User redirected to /dashboard.html
   ↓
4. Frontend calls /api/users/me/
   ├─ Browser sends sessionid cookie automatically
   ├─ Django validates session
   └─ Returns user data
   ↓
5. Frontend stores user info in-memory
   ├─ NOT in localStorage (security risk)
   └─ Display in UI
```

### CSRF Protection
```javascript
// assets/js/script.js (CURRENT)
function getCookie(name) {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')[1] || '';
}

window.posApiFetch = async function(url, options = {}) {
    const headers = new Headers(options.headers || {});
    
    // Add CSRF token for state-changing requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
        headers.set('X-CSRFToken', getCookie('csrftoken'));
    }
    
    return fetch(url, {
        credentials: 'same-origin',  // Send cookies
        ...options,
        headers
    });
};
```

---

## 🗄️ Database Transaction Pattern

### Sales with Inventory Decrement
```python
# backend/pos_api/views.py
from django.db import transaction

class SaleViewSet(viewsets.ModelViewSet):
    def create(self, request):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Start atomic transaction
        with transaction.atomic():
            # 1. Validate inventory
            products = {}
            for item in serializer.data['items']:
                product_id = item['product'].id
                products[product_id] = item['quantity']
            
            # 2. Lock inventory rows
            inventories = Inventory.objects.select_for_update().filter(
                product_id__in=products.keys()
            )
            
            # 3. Check stock availability
            for inventory in inventories:
                if inventory.quantity < products[inventory.product_id]:
                    raise ValidationError('Insufficient stock')
            
            # 4. Create sale
            sale = Sale.objects.create(
                customer_name=serializer.data.get('customer_name'),
                cashier=request.user,
                total_amount=Decimal('0.00')
            )
            
            # 5. Create sale items & decrement inventory
            for product_id, qty in products.items():
                inventory = inventories[product_id]
                SaleItem.objects.create(sale=sale, quantity=qty)
                inventory.quantity -= qty
                inventory.save()
            
            # 6. All changes committed atomically
            # If error occurs, all rolled back
        
        return Response(SaleSerializer(sale).data)
```

### Frontend Usage
```javascript
async function completeSale() {
    const saleData = {
        customer_name: "John Doe",
        payment_method: "Cash",
        items: [
            { product: 1, quantity: 2 },
            { product: 3, quantity: 1 }
        ]
    };
    
    try {
        const response = await api.request('/api/sales/', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
        
        if (response) {
            showToast(`Sale completed: ${response.sale_number}`);
            clearCart();
            updateInventoryDisplay();
        }
    } catch (error) {
        showToast(`Sale failed: ${error.message}`, 'error');
        // Inventory unchanged (transaction rolled back)
    }
}
```

---

## 🧪 Testing Checklist

### Unit Tests (Backend)
```python
# backend/pos_api/tests.py
class ProductTests(TestCase):
    def test_create_product(self):
        data = {'name': 'Mouse', 'category': 1, 'price': 50}
        response = self.client.post('/api/products/', data)
        self.assertEqual(response.status_code, 201)
    
    def test_invalid_product(self):
        data = {'name': ''}  # Empty name
        response = self.client.post('/api/products/', data)
        self.assertEqual(response.status_code, 400)
    
    def test_permission_denied(self):
        self.client.logout()
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 401)
```

### Integration Tests (Frontend + Backend)
```javascript
// test/integration.test.js
describe('Product API Integration', () => {
    test('Create and retrieve product', async () => {
        // 1. Create
        const created = await api.request('/api/products/', {
            method: 'POST',
            body: JSON.stringify({name: 'Keyboard', price: 100})
        });
        expect(created.id).toBeDefined();
        
        // 2. Retrieve
        const fetched = await api.request(`/api/products/${created.id}/`);
        expect(fetched.name).toBe('Keyboard');
        
        // 3. Update
        const updated = await api.request(`/api/products/${created.id}/`, {
            method: 'PATCH',
            body: JSON.stringify({price: 95})
        });
        expect(updated.price).toBe(95);
        
        // 4. Delete
        await api.request(`/api/products/${created.id}/`, {
            method: 'DELETE'
        });
    });
});
```

### End-to-End Tests (User Journey)
```javascript
// test/e2e.test.js (Using Playwright/Cypress)
test('Complete sales workflow', async () => {
    // 1. Login
    await page.goto('http://localhost:8000/');
    await page.fill('[name="username"]', 'cashier1');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    // 2. Navigate to sales
    await page.click('text=Sales');
    
    // 3. Search and add product
    await page.fill('[placeholder="Search products"]', 'Mouse');
    await page.click('text=Mouse');
    
    // 4. Set quantity
    await page.fill('input[type="number"]', '2');
    
    // 5. Checkout
    await page.click('button:has-text("Checkout")');
    
    // 6. Pay
    await page.click('label:has-text("Cash")');
    await page.click('button:has-text("Confirm Payment")');
    
    // 7. Verify success
    const success = await page.waitForSelector('text=Sale completed');
    expect(success).toBeTruthy();
});
```

---

## 📊 Performance Optimization

### Query Optimization
```python
# BEFORE: N+1 Query Problem
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    # This causes 1 query for products + 1 query per category

# AFTER: Use select_related
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related(
        'category',
        'inventory'
    ).all()
    # Single query with JOINs

# For reverse relationships use prefetch_related
class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.prefetch_related(
        'items__product',
        'items__product__category'
    ).all()
```

### Pagination
```python
# backend/pos_backend/settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25
}

# Frontend usage
const page = 1;
const response = await api.request(`/api/products/?page=${page}`);
// {count: 100, next: url, previous: url, results: [...]}
```

### Caching
```python
# backend/pos_api/views.py
from django.views.decorators.cache import cache_page

class CategoryViewSet(viewsets.ModelViewSet):
    @cache_page(60 * 5)  # Cache for 5 minutes
    def list(self, request):
        return super().list(request)
```

---

## 📝 Code Examples by Phase

### Phase 1: Example of Fixed Admin
```python
# backend/accounts/admin.py (FIXED)
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

@admin.register(User)
class POSUserAdmin(BaseUserAdmin):
    # Convert tuple concatenation to list
    fieldsets = list(BaseUserAdmin.fieldsets) + [
        ('POS access', {'fields': ('role', 'duty')}),
    ]
    add_fieldsets = list(BaseUserAdmin.add_fieldsets) + [
        ('POS access', {'fields': ('role', 'duty')}),
    ]
```

### Phase 2: Example of Product API Integration
```javascript
// assets/js/api-products.js (NEW)
class ProductsAPI {
    async list(page = 1) {
        return await api.request(`/api/products/?page=${page}`);
    }
    
    async get(id) {
        return await api.request(`/api/products/${id}/`);
    }
    
    async create(productData) {
        return await api.request('/api/products/', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }
    
    async update(id, changes) {
        return await api.request(`/api/products/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(changes)
        });
    }
    
    async delete(id) {
        return await api.request(`/api/products/${id}/`, {
            method: 'DELETE'
        });
    }
}

const productsAPI = new ProductsAPI();

// Usage in products.js
document.getElementById('addProductBtn').addEventListener('click', async () => {
    const productData = {
        name: document.getElementById('productName').value,
        category: parseInt(document.getElementById('category').value),
        selling_price: parseFloat(document.getElementById('sellingPrice').value),
        buying_price: parseFloat(document.getElementById('buyingPrice').value)
    };
    
    try {
        const result = await productsAPI.create(productData);
        showToast(`Product created: ${result.name}`);
        await refreshProductsList();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
});

async function refreshProductsList() {
    const products = await productsAPI.list();
    renderProducts(products.results);  // Use pagination
}
```

---

## 🎓 Learning Path

1. **Week 1 - Setup Phase**: Complete Phase 1, understand architecture
2. **Week 2-3 - Integration Phase**: Implement Phase 2 endpoints one by one
3. **Week 4 - Production Phase**: Configure deployment, logging, monitoring
4. **Week 5-6 - Enhancement Phase**: Add features, optimize performance

---

**This guide provides the technical roadmap for transforming your disconnected system into a fully integrated, persistent POS application.**

Last Updated: 2026-08-31
