document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id), search = $('productSearch'), filter = $('categoryFilter'), results = $('productResults'), selected = $('selectedItems'), total = $('selectedTotal'), modal = $('paymentModal');
    let products = [], categories = [], cart = [];
    const api = async (url, options) => { const r = await window.posApiFetch(url, options); if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.detail || Object.values(b).flat().join(' ') || 'Request failed.'); } return r.status === 204 ? null : r.json(); };
    const renderResults = () => { const q = search.value.toLowerCase(), category = filter.value; const matches = products.filter(p => p.is_active && p.quantity > 0 && (!q || p.name.toLowerCase().includes(q)) && (category === 'All' || String(p.category) === category)); results.innerHTML = matches.length ? `<table class="product-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th></tr></thead><tbody>${matches.map(p => `<tr data-id="${p.id}"><td>${p.name}</td><td>KES ${Number(p.selling_price).toFixed(2)}</td><td>${p.quantity}</td></tr>`).join('')}</tbody></table>` : '<div class="overlay-empty">No products found.</div>'; results.querySelectorAll('tr[data-id]').forEach(row => row.addEventListener('click', () => { const p = products.find(product => product.id === Number(row.dataset.id)); if (!cart.some(item => item.product === p.id)) cart.push({ product: p.id, name: p.name, price: Number(p.selling_price), quantity: 1, available: p.quantity }); renderCart(); })); };
    const renderCart = () => { selected.innerHTML = cart.length ? `<table class="cart-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Action</th></tr></thead><tbody>${cart.map(i => `<tr data-id="${i.product}"><td>${i.name}</td><td><input class="qty-input" type="number" min="1" max="${i.available}" value="${i.quantity}"></td><td>KES ${i.price.toFixed(2)}</td><td>KES ${(i.price * i.quantity).toFixed(2)}</td><td><button class="remove">Remove</button></td></tr>`).join('')}</tbody></table>` : '<p>No products selected.</p>'; const amount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0); total.textContent = `Total: KES ${amount.toFixed(2)}`; $('checkoutButton').disabled = !cart.length; selected.querySelectorAll('.qty-input').forEach(input => input.addEventListener('change', event => { const item = cart.find(i => i.product === Number(event.target.closest('tr').dataset.id)); item.quantity = Math.max(1, Math.min(item.available, Number(event.target.value) || 1)); renderCart(); })); selected.querySelectorAll('.remove').forEach(button => button.addEventListener('click', event => { cart = cart.filter(i => i.product !== Number(event.target.closest('tr').dataset.id)); renderCart(); })); };
    const load = async () => { [products, categories] = await Promise.all([api('/api/products/'), api('/api/categories/')]); filter.innerHTML = '<option value="All">All Categories</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); renderResults(); renderCart(); };
    const syncPaymentFields = () => { $('mpesaSection').classList.toggle('hidden', document.querySelector('input[name="paymentMethod"]:checked')?.value !== 'M-Pesa'); };
    search.addEventListener('input', renderResults); filter.addEventListener('change', renderResults); $('clearSearch').addEventListener('click', () => { search.value = ''; renderResults(); }); $('checkoutButton').addEventListener('click', () => { $('modalTotal').textContent = total.textContent.replace('Total: ', ''); syncPaymentFields(); modal.classList.remove('hidden'); }); $('closeModalButton').addEventListener('click', () => modal.classList.add('hidden')); document.querySelectorAll('input[name="paymentMethod"]').forEach(input => input.addEventListener('change', syncPaymentFields));
    $('confirmPayButton').addEventListener('click', async () => {
        if (!cart.length) return showToast('Add at least one item before submitting payment.', 'error');
        const submitButton = $('confirmPayButton');
        try {
            const payment_method = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Cash';
            const payment_reference = $('mpesaNumber').value.trim();
            if (payment_method === 'M-Pesa' && !payment_reference) return showToast('Enter the M-Pesa number or transaction reference.', 'error');
            submitButton.disabled = true;
            await api('/api/sales/', { method: 'POST', body: JSON.stringify({ payment_method, payment_reference, items: cart.map(i => ({ product: i.product, quantity: i.quantity })) }) });
            showToast('Sale recorded.');
            cart = [];
            $('mpesaNumber').value = '';
            modal.classList.add('hidden');
            await load();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
    load().catch(error => { results.innerHTML = `<p>${error.message}</p>`; });
});
