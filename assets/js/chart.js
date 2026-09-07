function formatCurrency(value) { return `KES ${Number(value || 0).toFixed(2)}`; }

window.renderDashboardCharts = async function renderDashboardCharts() {
    const fetchData = async url => { const response = await window.posApiFetch(url); if (!response.ok) throw new Error('Could not load dashboard data.'); return response.json(); };
    try {
        const [sales, products] = await Promise.all([fetchData('/api/sales/'), fetchData('/api/products/')]);
        const today = new Date().toDateString(), todaysSales = sales.filter(s => new Date(s.created_at).toDateString() === today);
        const revenue = todaysSales.reduce((total, s) => total + Number(s.total_amount), 0);
        const orders = todaysSales.length;
        const profit = todaysSales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + (Number(item.unit_price) - Number(products.find(p => p.id === item.product)?.buying_price || 0)) * item.quantity, 0), 0);
        document.getElementById('todayRevenue').textContent = formatCurrency(revenue);
        document.getElementById('todayOrders').textContent = orders;
        document.getElementById('todayAvgSale').textContent = formatCurrency(orders ? revenue / orders : 0);
        document.getElementById('todayGrossProfit').textContent = formatCurrency(profit);
        const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return date; });
        const daily = days.map(date => sales.filter(s => new Date(s.created_at).toDateString() === date.toDateString()).reduce((total, s) => total + Number(s.total_amount), 0));
        const productTotals = {}; sales.forEach(s => s.items.forEach(item => { productTotals[item.product_name] = (productTotals[item.product_name] || 0) + item.quantity; }));
        const paymentTotals = {}; sales.forEach(s => { paymentTotals[s.payment_method] = (paymentTotals[s.payment_method] || 0) + 1; });
        const charts = [
            ['salesTrend', 'line', days.map(d => d.toLocaleDateString('en', { weekday: 'short' })), daily, 'Sales'],
            ['topProducts', 'bar', Object.keys(productTotals), Object.values(productTotals), 'Items sold'],
            ['paymentMethods', 'doughnut', Object.keys(paymentTotals), Object.values(paymentTotals), 'Payments'],
        ];
        charts.forEach(([id, type, labels, values, label]) => { const canvas = document.getElementById(id); if (!canvas || !window.Chart) return; Chart.getChart(canvas)?.destroy(); new Chart(canvas, { type, data: { labels: labels.length ? labels : ['No data'], datasets: [{ label, data: values.length ? values : [0], backgroundColor: '#2563eb', borderColor: '#2563eb', fill: type === 'line' }] }, options: { responsive: true } }); });
    } catch (error) { console.error(error); }
};

document.addEventListener('DOMContentLoaded', window.renderDashboardCharts);
