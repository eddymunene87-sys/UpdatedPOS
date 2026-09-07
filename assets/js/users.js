(function () {
    const form = document.getElementById('createUserForm');
    const list = document.getElementById('userList');
    const message = document.getElementById('userMessage');

    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[character]));

    function displayMessage(text, isError = false) {
        message.textContent = text;
        message.style.color = isError ? '#dc2626' : '#16a34a';
    }

    async function readError(response) {
        const data = await response.json().catch(() => null);
        if (!data) return 'Request failed.';
        return Object.values(data).flat().join(' ') || 'Request failed.';
    }

    async function loadUsers() {
        const response = await window.posApiFetch('/api/users/');
        if (!response.ok) {
            list.innerHTML = '<p>Unable to load cashier accounts.</p>';
            return;
        }
        const users = await response.json();
        if (!users.length) {
            list.innerHTML = '<p>No cashier accounts exist yet.</p>';
            return;
        }
        list.innerHTML = `<table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Duty</th><th>Status</th><th>Actions</th></tr></thead><tbody>${users.map(user => `
            <tr data-id="${user.id}">
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(`${user.first_name} ${user.last_name}`.trim())}</td>
                <td>${escapeHtml(user.is_superuser ? 'Superuser' : user.role)}</td>
                <td><input class="duty-input" value="${escapeHtml(user.duty)}"></td>
                <td><select class="status-input"><option value="true" ${user.is_active ? 'selected' : ''}>Active</option><option value="false" ${user.is_active ? '' : 'selected'}>Inactive</option></select></td>
                <td><button class="pay-button save-user" type="button">Save</button> <button class="secondary-btn reset-password" type="button">Reset Password</button> <button class="remove-btn remove-user" type="button">Remove</button></td>
            </tr>`).join('')}</tbody></table>`;

        list.querySelectorAll('.save-user').forEach(button => button.addEventListener('click', async () => {
            const row = button.closest('tr');
            const response = await window.posApiFetch(`/api/users/${row.dataset.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    duty: row.querySelector('.duty-input').value.trim(),
                    is_active: row.querySelector('.status-input').value === 'true',
                }),
            });
            displayMessage(response.ok ? 'Cashier account updated.' : await readError(response), !response.ok);
            if (response.ok) loadUsers();
        }));

        list.querySelectorAll('.reset-password').forEach(button => button.addEventListener('click', async () => {
            const password = window.prompt('Enter the new temporary password (at least 8 characters):');
            if (!password) return;
            const row = button.closest('tr');
            const response = await window.posApiFetch(`/api/users/${row.dataset.id}/reset-password/`, {
                method: 'POST', body: JSON.stringify({ new_password: password }),
            });
            displayMessage(response.ok ? 'Password reset successfully.' : await readError(response), !response.ok);
        }));

        list.querySelectorAll('.remove-user').forEach(button => button.addEventListener('click', async () => {
            const row = button.closest('tr');
            if (!window.confirm('Remove this cashier? Their account will be deactivated.')) return;
            const response = await window.posApiFetch(`/api/users/${row.dataset.id}/`, { method: 'DELETE' });
            displayMessage(response.ok ? 'Cashier account deactivated.' : await readError(response), !response.ok);
            if (response.ok) loadUsers();
        }));
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const response = await window.posApiFetch('/api/users/', {
            method: 'POST',
            body: JSON.stringify({
                username: document.getElementById('newUsername').value.trim(),
                password: document.getElementById('newPassword').value,
                first_name: document.getElementById('newFirstName').value.trim(),
                last_name: document.getElementById('newLastName').value.trim(),
                email: document.getElementById('newEmail').value.trim(),
                duty: document.getElementById('newDuty').value.trim(),
                role: 'cashier',
            }),
        });
        if (!response.ok) {
            displayMessage(await readError(response), true);
            return;
        }
        form.reset();
        displayMessage('Cashier account created.');
        loadUsers();
    });

    loadUsers();
})();
