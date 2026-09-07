(function () {
    const form = document.getElementById('accountForm');
    const message = document.getElementById('accountMessage');

    function displayMessage(text, isError = false) {
        message.textContent = text;
        message.style.color = isError ? '#dc2626' : '#16a34a';
    }

    async function loadAccount() {
        const response = await window.posApiFetch('/api/users/me/');
        if (!response.ok) throw new Error('Could not load your account.');
        const user = await response.json();
        document.getElementById('accountUsername').value = user.username || '';
        document.getElementById('accountFirstName').value = user.first_name || '';
        document.getElementById('accountLastName').value = user.last_name || '';
        document.getElementById('accountEmail').value = user.email || '';
        document.getElementById('accountRole').value = user.is_superuser ? 'Superuser' : user.role;
        document.getElementById('accountDuty').value = user.duty || 'Not assigned';
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const response = await window.posApiFetch('/api/users/me/', {
            method: 'PATCH',
            body: JSON.stringify({
                first_name: document.getElementById('accountFirstName').value.trim(),
                last_name: document.getElementById('accountLastName').value.trim(),
                email: document.getElementById('accountEmail').value.trim(),
            }),
        });

        if (!response.ok) {
            displayMessage('Could not save your account information.', true);
            return;
        }
        displayMessage('Account information saved.');
    });

    loadAccount().catch(error => displayMessage(error.message, true));
})();
