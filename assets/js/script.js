const sidebar = document.querySelector('.sidebar');
const topbar = document.querySelector('.topbar');
const body = document.body;

if (sidebar && topbar) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    body.appendChild(overlay);

    const toggleButton = document.createElement('button');
    toggleButton.className = 'menu-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle navigation');
    toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
    topbar.insertBefore(toggleButton, topbar.firstChild);

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        body.classList.remove('sidebar-open');
    };

    const openSidebar = () => {
        sidebar.classList.add('open');
        overlay.classList.add('show');
        body.classList.add('sidebar-open');
    };

    toggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeSidebar();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            closeSidebar();
        }
    });

    document.querySelectorAll('.sidebar li a').forEach((link) => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.sidebar li').forEach((li) => li.classList.remove('active'));
            link.closest('li').classList.add('active');
            if (window.innerWidth <= 992) {
                closeSidebar();
            }
        });
    });
}

// Shared feedback helper. Every Django-rendered POS page loads this file;
// business data is deliberately not sourced from the legacy localStorage module.
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

function getCookie(name) {
    return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1] || '';
}

window.posApiFetch = async function posApiFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
        headers.set('X-CSRFToken', decodeURIComponent(getCookie('csrftoken')));
    }
    return fetch(url, { credentials: 'same-origin', ...options, method, headers });
};

async function addAccountNavigation() {
    const navigation = document.querySelector('.sidebar ul');
    if (!navigation || navigation.dataset.accountNavigationLoaded) return;

    try {
        const response = await window.posApiFetch('/api/users/me/');
        if (!response.ok) return;
        const user = await response.json();
        navigation.dataset.accountNavigationLoaded = 'true';

        document.querySelectorAll('.user').forEach(element => {
            element.textContent = `${user.username} (${user.is_superuser ? 'Superuser' : user.role})`;
        });

        const addLink = (href, icon, label) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = href;
            link.innerHTML = `<i class="fas ${icon}"></i><span>${label}</span>`;
            item.appendChild(link);
            navigation.appendChild(item);
        };

        if (user.is_superuser || user.role === 'manager') {
            addLink('users.html', 'fa-users-cog', 'Cashier Management');
        }
        addLink('account.html', 'fa-user-cog', 'My Account');
    } catch (error) {
        console.error('Could not load the signed-in user.', error);
    }
}

addAccountNavigation();
