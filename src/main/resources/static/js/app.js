// Глобальные переменные
let currentUser = null;
const csrfToken = document.querySelector('meta[name="_csrf"]')?.content || '';
const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content || 'X-CSRF-TOKEN';

console.log('Script loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
});

// Основные функции
async function initializeApp() {
    try {
        console.log('Initializing app...');

        // Сначала скрываем всё, что может мелькать
        hideAdminElements();

        currentUser = await loadCurrentUser();
        console.log('Current user:', currentUser);

        updateUI();
        setupEventListeners();

        if (currentUser && currentUser.roles.includes('ADMIN')) {
            console.log('User is admin, loading admin data...');
            try {
                await loadAdminData();
                // Автоматически "кликаем" на админ-панель для админов
                const adminLink = document.querySelector('.sidebar .nav-link[data-target="adminPanelBlock"]');
                if (adminLink) {
                    adminLink.click();
                }
            } catch (error) {
                console.error('Admin data loading error:', error);
                showError('Failed to load admin data');
            }
        } else {
            // Для обычных пользователей показываем информацию о пользователе
            document.getElementById('userInfoBlock').style.display = 'block';
            const userInfoLink = document.querySelector('.sidebar .nav-link[data-target="userInfoBlock"]');
            if (userInfoLink) {
                userInfoLink.click();
            }
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application');
    }
}

function hideAdminElements() {
    // Скрываем все элементы
    document.getElementById('adminNavItem').style.display = 'none';
    document.getElementById('adminPanelBlock').style.display = 'none';
    document.getElementById('usersTableBlock').style.display = 'none';
    document.getElementById('addUserFormBlock').style.display = 'none';
    document.getElementById('userInfoBlock').style.display = 'none';
}

async function loadAdminData() {
    try {
        // Активируем вкладку Users table
        const defaultTab = document.querySelector('#adminTabs .nav-link[data-target="usersTableBlock"]');
        if (defaultTab) {
            defaultTab.click();
        }

        await loadUsers();
        await setupAddUserForm();
    } catch (error) {
        showError('Failed to load admin data: ' + error.message);
    }
}

function updateUI() {
    updateHeader();

    const adminNavItem = document.getElementById('adminNavItem');
    if (currentUser && currentUser.roles.some(role => role.includes('ADMIN'))) {
        adminNavItem.style.display = 'block';
        document.getElementById('adminPanelBlock').style.display = 'block';
        document.getElementById('userInfoBlock').style.display = 'none'; // Скрываем инфо о пользователе

        // Активируем вкладку Users table по умолчанию для админов
        const defaultTab = document.querySelector('#adminTabs .nav-link[data-target="usersTableBlock"]');
        if (defaultTab) {
            defaultTab.click();
        }

        // Также делаем активной ссылку на админ-панель в сайдбаре
        const adminLink = document.querySelector('.sidebar .nav-link[data-target="adminPanelBlock"]');
        if (adminLink) {
            adminLink.classList.add('active');
        }
    } else {
        adminNavItem.style.display = 'none';
        document.getElementById('adminPanelBlock').style.display = 'none';
        document.getElementById('userInfoBlock').style.display = 'block'; // Показываем инфо о пользователе

        // Делаем активной ссылку на инфо о пользователе
        const userInfoLink = document.querySelector('.sidebar .nav-link[data-target="userInfoBlock"]');
        if (userInfoLink) {
            userInfoLink.classList.add('active');
        }
    }

    showUserInfo();
}

function updateHeader() {
    if (currentUser) {
        const headerElement = document.getElementById('userHeader');
        headerElement.textContent = `${currentUser.username} with roles: ${Array.from(currentUser.roles).join(', ')}`;
    }
}

function showUserInfo() {
    if (!currentUser) return;

    const tableBody = document.querySelector('#userInfoTable tbody');
    tableBody.innerHTML = `
        <tr>
            <th>ID</th>
            <td>${currentUser.id}</td>
        </tr>
        <tr>
            <th>Username</th>
            <td>${currentUser.username}</td>
        </tr>
        <tr>
            <th>Roles</th>
            <td>${Array.from(currentUser.roles).join(', ')}</td>
        </tr>
    `;
}

async function loadUsers() {
    try {
        console.log('Loading users...');
        const response = await fetch('/api/users', {
            headers: {
                [csrfHeader]: csrfToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        console.log('Users loaded:', users);
        renderUsersTable(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users: ' + error.message);
    }
}

function renderUsersTable(users) {
    console.log('Rendering users:', users);
    const table = document.getElementById('usersTable');
    if (!table) {
        console.error('Table not found!');
        return;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('Table body not found!');
        return;
    }

    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        const roles = Array.isArray(user.roles) ? user.roles :
            (user.roles ? Array.from(user.roles) : []);

        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${roles.join(', ')}</td>
            <td>
                <button class="btn btn-edit" data-id="${user.id}">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
                <button class="btn btn-delete" data-id="${user.id}">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Добавляем обработчики для кнопок
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditForm(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

async function setupAddUserForm() {
    try {
        const response = await fetch('/api/users/roles', {
            headers: {
                [csrfHeader]: csrfToken
            }
        });
        if (!response.ok) throw new Error('Failed to fetch roles');
        const roles = await response.json();

        const container = document.getElementById('rolesContainer');
        container.innerHTML = roles.map(role => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       name="roles" value="${role.name}" id="role-${role.id}">
                <label class="form-check-label" for="role-${role.id}">
                    ${role.name.replace('ROLE_', '')}
                </label>
            </div>
        `).join('');
    } catch (error) {
        showError('Failed to load roles: ' + error.message);
    }
}

// Модальные окна
async function openEditForm(userId) {
    try {
        // Загружаем данные пользователя
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) throw new Error('Failed to fetch user data');
        const user = await userResponse.json();

        // Загружаем список ролей
        const rolesResponse = await fetch('/api/users/roles');
        if (!rolesResponse.ok) throw new Error('Failed to fetch roles');
        const allRoles = await rolesResponse.json();

        // Создаем форму редактирования
        const formHtml = `
            <form id="editUserForm">
                <div class="mb-3">
                    <label for="editUsername" class="form-label">Username</label>
                    <input type="text" class="form-control" id="editUsername" 
                           value="${user.username}" required>
                </div>
                <div class="mb-3">
                    <label for="editPassword" class="form-label">Password (leave blank to keep unchanged)</label>
                    <input type="password" class="form-control" id="editPassword">
                </div>
                <div class="mb-3">
                    <label class="form-label">Roles</label>
                    ${allRoles.map(role => `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" 
                                   name="editRoles" value="${role.name}" 
                                   id="editRole-${role.id}"
                                   ${user.roles.includes(role.name) ? 'checked' : ''}>
                            <label class="form-check-label" for="editRole-${role.id}">
                                ${role.name}
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="d-flex justify-content-end">
                    <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save changes</button>
                </div>
            </form>
        `;

        // Вставляем форму в модальное окно
        document.getElementById('editFormContainer').innerHTML = formHtml;

        // Инициализируем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();

        // Добавляем обработчик формы
        document.getElementById('editUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitEditForm(userId);
            modal.hide();
        });

    } catch (error) {
        showError('Failed to open edit form: ' + error.message);
    }
}

async function submitEditForm(userId) {
    try {
        const selectedRoles = Array.from(document.querySelectorAll('input[name="editRoles"]:checked'))
            .map(checkbox => checkbox.value);

        const userData = {
            username: document.getElementById('editUsername').value,
            password: document.getElementById('editPassword').value || undefined,
            roles: selectedRoles
        };

        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                [csrfHeader]: csrfToken
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error('Failed to update user');

        // Обновляем данные
        await updateAfterChanges();
        showSuccess('User updated successfully');
    } catch (error) {
        showError('Failed to update user: ' + error.message);
    }
}

async function openDeleteModal(userId) {
    try {
        // Загружаем данные пользователя
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        const user = await response.json();

        // Создаем содержимое модального окна
        const modalContent = `
            <p>Are you sure you want to delete user <strong>${user.username}</strong>?</p>
            <div class="d-flex justify-content-end">
                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
            </div>
        `;

        // Вставляем содержимое в модальное окно
        document.getElementById('deleteFormContainer').innerHTML = modalContent;

        // Инициализируем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
        modal.show();

        // Добавляем обработчик кнопки удаления
        document.getElementById('confirmDelete').addEventListener('click', async () => {
            await deleteUser(userId);
            modal.hide();
        });

    } catch (error) {
        showError('Failed to open delete modal: ' + error.message);
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                [csrfHeader]: csrfToken
            }
        });

        if (!response.ok) throw new Error('Failed to delete user');

        // Обновляем данные
        await updateAfterChanges();
        showSuccess('User deleted successfully');
    } catch (error) {
        showError('Failed to delete user: ' + error.message);
    }
}

async function updateAfterChanges() {
    // Перезагружаем текущего пользователя
    currentUser = await loadCurrentUser();

    // Обновляем интерфейс
    updateUI();

    // Если открыта админ-панель, обновляем данные
    if (document.getElementById('adminPanelBlock').classList.contains('active') &&
        currentUser && currentUser.roles.some(role => role.includes('ADMIN'))) {
        await loadAdminData();
    }
}

// Вспомогательные функции
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/users/current', {
            headers: {
                [csrfHeader]: csrfToken
            }
        });
        if (!response.ok) throw new Error('Failed to fetch current user');
        return await response.json();
    } catch (error) {
        console.error('Failed to load current user:', error);
        return null;
    }
}

function showError(message) {
    const toastContainer = document.getElementById('toastContainer');
    const toastHtml = `
        <div class="toast show align-items-center text-white bg-danger" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    const toastElement = document.createElement('div');
    toastElement.innerHTML = toastHtml;
    toastContainer.appendChild(toastElement);

    setTimeout(() => {
        toastElement.remove();
    }, 5000);
}

function showSuccess(message) {
    const toastContainer = document.getElementById('toastContainer');
    const toastHtml = `
        <div class="toast show align-items-center text-white bg-success" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    const toastElement = document.createElement('div');
    toastElement.innerHTML = toastHtml;
    toastContainer.appendChild(toastElement);

    setTimeout(() => {
        toastElement.remove();
    }, 5000);
}

// Обработчики событий
function setupEventListeners() {
// Обработчики для навигации
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Убираем активный класс у всех ссылок
            document.querySelectorAll('.sidebar .nav-link').forEach(item => {
                item.classList.remove('active');
            });

            // Добавляем активный класс текущей ссылке
            link.classList.add('active');

            // Скрываем все блоки контента
            document.querySelectorAll('.content-block').forEach(block => {
                block.classList.remove('active');
                block.style.display = 'none';
            });

            // Показываем нужный блок
            const targetBlock = document.getElementById(link.dataset.target);
            if (targetBlock) {
                targetBlock.classList.add('active');
                targetBlock.style.display = 'block';

                // Если открыли админ-панель, загружаем данные (только для админов)
                if (link.dataset.target === 'adminPanelBlock' &&
                    currentUser && currentUser.roles.some(role => role.includes('ADMIN'))) {
                    // Активируем вкладку Users table
                    const defaultTab = document.querySelector('#adminTabs .nav-link[data-target="usersTableBlock"]');
                    if (defaultTab) {
                        defaultTab.click();
                    }
                    loadAdminData();
                }
            }
        });
    });

    // Обработчики для табов админ-панели (только для админов)
    if (currentUser && currentUser.roles.some(role => role.includes('ADMIN'))) {
        document.querySelectorAll('#adminTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();

                // Убираем активный класс у всех табов
                document.querySelectorAll('#adminTabs .nav-link').forEach(item => {
                    item.classList.remove('active');
                });

                // Добавляем активный класс текущему табу
                tab.classList.add('active');

                // Скрываем все блоки контента в админ-панели
                document.querySelectorAll('#adminPanelBlock .content-block').forEach(block => {
                    block.classList.remove('active');
                    block.style.display = 'none';
                });

                // Показываем нужный блок
                const targetBlock = document.getElementById(tab.dataset.target);
                if (targetBlock) {
                    targetBlock.classList.add('active');
                    targetBlock.style.display = 'block';

                    // Если это вкладка Users table, загружаем данные
                    if (tab.dataset.target === 'usersTableBlock') {
                        loadUsers();
                    }

                    // Если это вкладка Add User, загружаем роли
                    if (tab.dataset.target === 'addUserFormBlock') {
                        setupAddUserForm();
                    }
                }
            });
        });

        // Обработчик кнопки "Cancel" в форме добавления
        document.getElementById('cancelAddUser')?.addEventListener('click', () => {
            // Переключаем таб на таблицу
            document.querySelector('#adminTabs .nav-link[data-target="usersTableBlock"]').click();
        });

        // Обработчик формы добавления пользователя
        const addForm = document.getElementById('addUserForm');
        if (addForm) {
            addForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = {
                    username: e.target.username.value,
                    password: e.target.password.value,
                    roles: Array.from(document.querySelectorAll('input[name="roles"]:checked'))
                        .map(checkbox => checkbox.value) // Оставляем полные имена ролей (с ROLE_)
                };

                console.log('Submitting form data:', formData); // Добавьте логирование

                try {
                    const response = await fetch('/api/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            [csrfHeader]: csrfToken
                        },
                        body: JSON.stringify(formData)
                    });

                    if (!response.ok) {
                        const errorData = await response.json(); // Попробуйте получить тело ошибки
                        console.error('Error response:', errorData);
                        throw new Error(errorData.message || 'Failed to add user');
                    }

                    // Очищаем форму
                    e.target.reset();
                    document.querySelectorAll('input[name="roles"]').forEach(checkbox => {
                        checkbox.checked = false;
                    });

                    // Обновляем таблицу пользователей
                    await loadUsers();

                    showSuccess('User added successfully');

                    // Возвращаемся к таблице
                    document.querySelector('#adminTabs .nav-link[data-target="usersTableBlock"]').click();

                } catch (error) {
                    console.error('Add user error:', error);
                    showError('Failed to add user: ' + error.message);
                }
            });
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);