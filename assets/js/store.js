const STORAGE_KEYS = {
    products: 'pos_products',
    categories: 'pos_categories',
    sales: 'pos_sales',
    repairs: 'pos_repairs',
    stockHistory: 'pos_stock_history',
};

const LOW_STOCK_THRESHOLD = 5;

function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getProducts() {
    return loadData(STORAGE_KEYS.products);
}

function getStockHistory() {
    return loadData(STORAGE_KEYS.stockHistory);
}

function saveStockHistory(entry) {
    const history = getStockHistory();
    history.push(entry);
    saveData(STORAGE_KEYS.stockHistory, history);
    return history;
}

function getLowStockProducts() {
    return getProducts().filter(product => Number(product.quantity) <= LOW_STOCK_THRESHOLD);
}

function getLowStockCount() {
    return getLowStockProducts().length;
}

function deductInventory(saleProducts) {
    const products = getProducts();
    saleProducts.forEach(saleItem => {
        const product = products.find(item => item.id === Number(saleItem.id));
        if (product) {
            product.quantity = Math.max(0, Number(product.quantity) - 1);
        }
    });
    saveData(STORAGE_KEYS.products, products);
    return products;
}

function saveProduct(product) {
    const products = getProducts();
    const match = products.find(item => item.name.toLowerCase() === product.name.toLowerCase() && item.category === product.category);
    if (match) {
        match.quantity = Number(match.quantity) + Number(product.quantity);
        match.price = Number(product.price);
        match.buyingPrice = Number(product.buyingPrice);
        match.updatedAt = new Date().toISOString();
        match.updatedBy = product.addedBy || match.updatedBy;
    } else {
        products.push({
            id: Date.now(),
            name: product.name,
            category: product.category,
            quantity: Number(product.quantity),
            price: Number(product.price),
            buyingPrice: Number(product.buyingPrice),
            addedBy: product.addedBy || 'Admin',
            addedAt: new Date().toISOString(),
        });
    }
    saveData(STORAGE_KEYS.products, products);
    saveStockHistory({
        id: Date.now(),
        productName: product.name,
        category: product.category,
        quantity: Number(product.quantity),
        price: Number(product.price),
        buyingPrice: Number(product.buyingPrice),
        addedBy: product.addedBy || 'Admin',
        addedAt: new Date().toISOString(),
    });
    return products;
}

function updateProduct(id, updates) {
    const products = getProducts();
    const productIndex = products.findIndex(item => item.id === Number(id));
    if (productIndex === -1) {
        return products;
    }
    products[productIndex] = {
        ...products[productIndex],
        ...updates,
        quantity: Number(updates.quantity ?? products[productIndex].quantity),
        price: Number(updates.price ?? products[productIndex].price),
    };
    saveData(STORAGE_KEYS.products, products);
    return products;
}

function deleteProduct(id) {
    const products = getProducts();
    const filtered = products.filter(item => item.id !== Number(id));
    saveData(STORAGE_KEYS.products, filtered);
    return filtered;
}

function getCategories() {
    return loadData(STORAGE_KEYS.categories);
}

function addCategory(name) {
    const categories = getCategories();
    const normalized = name.trim();
    if (!normalized || categories.includes(normalized)) {
        return categories;
    }
    categories.push(normalized);
    saveData(STORAGE_KEYS.categories, categories);
    return categories;
}

function deleteCategory(name) {
    const categories = getCategories();
    const filtered = categories.filter(category => category !== name);
    saveData(STORAGE_KEYS.categories, filtered);
    return filtered;
}

function getSales() {
    return loadData(STORAGE_KEYS.sales);
}

function saveSale(sale) {
    const sales = getSales();
    sales.push(sale);
    saveData(STORAGE_KEYS.sales, sales);
    return sales;
}

function getRepairs() {
    return loadData(STORAGE_KEYS.repairs);
}

function saveRepair(repair) {
    const repairs = getRepairs();
    repairs.push(repair);
    saveData(STORAGE_KEYS.repairs, repairs);
    return repairs;
}

function updateRepair(ticket, update) {
    const repairs = getRepairs();
    const repairIndex = repairs.findIndex(item => item.ticket === ticket);
    if (repairIndex === -1) {
        return repairs;
    }
    repairs[repairIndex] = {
        ...repairs[repairIndex],
        ...update,
    };
    saveData(STORAGE_KEYS.repairs, repairs);
    return repairs;
}

function deleteRepair(ticket) {
    const repairs = getRepairs();
    const filtered = repairs.filter(item => item.ticket !== ticket);
    saveData(STORAGE_KEYS.repairs, filtered);
    return filtered;
}

function getNextRepairTicket() {
    const repairs = getRepairs();
    const next = repairs.length + 1;
    return `R-${String(next).padStart(5, '0')}`;
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3200);
}
