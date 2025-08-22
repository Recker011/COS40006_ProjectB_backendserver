document.addEventListener('DOMContentLoaded', () => {
    // Dashboard Elements
    const serverLogsElement = document.getElementById('server-logs');
    const userInputElement = document.getElementById('user-input');
    const sendCommandButton = document.getElementById('send-command');
    const serverResponseElement = document.getElementById('server-response');

    // API Demonstration Elements
    const healthCheckBtn = document.getElementById('health-check-btn');
    const healthCheckResponse = document.getElementById('health-check-response');

    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginResponse = document.getElementById('login-response');
    const currentTokenSpan = document.getElementById('current-token');

    const articlesSearchInput = document.getElementById('articles-search-input');
    const articlesGetLang = document.getElementById('articles-get-lang'); // New
    const articlesGetTagInput = document.getElementById('articles-get-tag-input'); // New
    const articlesGetBtn = document.getElementById('articles-get-btn');
    const articlesGetResponse = document.getElementById('articles-get-response');

    const articleIdInput = document.getElementById('article-id-input');
    const articleGetSingleLang = document.getElementById('article-get-single-lang'); // New
    const articleGetSingleBtn = document.getElementById('article-get-single-btn');
    const articleGetSingleResponse = document.getElementById('article-get-single-response');
    const articleGetSingleTagsSpan = document.getElementById('article-get-single-tags'); // New

    const articleCreateTitle = document.getElementById('article-create-title');
    const articleCreateContent = document.getElementById('article-create-content');
    const articleCreateImage = document.getElementById('article-create-image');
    const articleCreateTagsInput = document.getElementById('article-create-tags'); // New
    const articleCreateLang = document.getElementById('article-create-lang'); // New
    const articleCreateBtn = document.getElementById('article-create-btn');
    const articleCreateResponse = document.getElementById('article-create-response');

    const articleUpdateId = document.getElementById('article-update-id');
    const articleUpdateTitle = document.getElementById('article-update-title');
    const articleUpdateContent = document.getElementById('article-update-content');
    const articleUpdateImage = document.getElementById('article-update-image');
    const articleUpdateTagsInput = document.getElementById('article-update-tags'); // New
    const articleUpdateLang = document.getElementById('article-update-lang'); // New
    const articleUpdateBtn = document.getElementById('article-update-btn');
    const articleUpdateResponse = document.getElementById('article-update-response');

    const articleDeleteId = document.getElementById('article-delete-id');
    const articleDeleteBtn = document.getElementById('article-delete-btn');
    const articleDeleteResponse = document.getElementById('article-delete-response');

    let authToken = sessionStorage.getItem('authToken') || null;
    if (authToken) {
        currentTokenSpan.textContent = authToken.substring(0, 30) + '...';
    }

    // Helper function to display JSON responses
    const displayResponse = (element, data) => {
        element.textContent = JSON.stringify(data, null, 2);
    };

    // Generic API Request Function
    const apiRequest = async (endpoint, method = 'GET', body = null, authenticated = false) => {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (authenticated && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        } else if (authenticated && !authToken) {
            addLogEntry(`[${new Date().toLocaleString()}] Error: Authentication required for ${endpoint}, but no token found.`);
            return { error: 'Authentication required, no token found.' };
        }

        try {
            const options = { method, headers };
            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(endpoint, options);
            if (response.status === 204) {
                return { ok: true, message: 'No Content' }; // Or simply return null/undefined
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error during API request to ${endpoint}:`, error);
            addLogEntry(`[${new Date().toLocaleString()}] Error: Could not reach ${endpoint}.`);
            return { error: error.message };
        }
    };


    // Function to add a new log entry
    const addLogEntry = (logMessage) => {
        const listItem = document.createElement('li');
        listItem.textContent = logMessage;
        serverLogsElement.prepend(listItem); // Add to the top
        if (serverLogsElement.children.length > 10) { // Keep only last 10 logs
            serverLogsElement.removeChild(serverLogsElement.lastChild);
        }
    };

    // Event Listeners for Dashboard

    sendCommandButton.addEventListener('click', () => {
        const command = userInputElement.value.trim();
        if (command) {
            addLogEntry(`[${new Date().toLocaleString()}] Command sent: "${command}"`);
            serverResponseElement.textContent = `Processing command: "${command}"...`;
            // Simulate server response
            setTimeout(() => {
                serverResponseElement.textContent = `Command "${command}" executed successfully.`;
                userInputElement.value = '';
            }, 1500);
        } else {
            serverResponseElement.textContent = 'Please enter a command.';
        }
    });

    // Event Listeners for API Demonstrations

    // GET /api/health
    healthCheckBtn.addEventListener('click', async () => {
        const data = await apiRequest('/api/health');
        displayResponse(healthCheckResponse, data);
    });

    // POST /api/auth/login
    loginBtn.addEventListener('click', async () => {
        const email = loginEmail.value;
        const password = loginPassword.value;
        const data = await apiRequest('/api/auth/login', 'POST', { email, password });
        displayResponse(loginResponse, data);
        if (data.ok && data.token) {
            authToken = data.token;
            sessionStorage.setItem('authToken', authToken);
            currentTokenSpan.textContent = authToken.substring(0, 30) + '...';
            addLogEntry(`[${new Date().toLocaleString()}] Login successful. Token stored.`);
        } else {
            authToken = null;
            sessionStorage.removeItem('authToken');
            currentTokenSpan.textContent = 'None';
            addLogEntry(`[${new Date().toLocaleString()}] Login failed.`);
        }
    });

    // GET /api/articles
    articlesGetBtn.addEventListener('click', async () => {
        const searchTerm = articlesSearchInput.value.trim();
        const lang = articlesGetLang.value; // Get selected language
        const tag = articlesGetTagInput.value.trim(); // Get tag for filtering
        let endpoint = '/api/articles';
        const queryParams = [];

        if (searchTerm) {
            queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
        }
        if (lang) {
            queryParams.push(`lang=${lang}`);
        }
        if (tag) {
            queryParams.push(`tag=${encodeURIComponent(tag)}`);
        }

        if (queryParams.length > 0) {
            endpoint += `?${queryParams.join('&')}`;
        }

        const data = await apiRequest(endpoint);
        displayResponse(articlesGetResponse, data);
    });

    // GET /api/articles/:id
    articleGetSingleBtn.addEventListener('click', async () => {
        const articleId = articleIdInput.value.trim();
        if (!articleId) {
            displayResponse(articleGetSingleResponse, { error: 'Please enter an Article ID.' });
            return;
        }
        const lang = articleGetSingleLang.value; // Get selected language
        const data = await apiRequest(`/api/articles/${articleId}?lang=${lang}`); // Include lang in query
        if (data.error) {
            articleGetSingleResponse.textContent = `Error: ${data.error}`;
            articleGetSingleTagsSpan.textContent = 'None';
        } else {
            displayResponse(articleGetSingleResponse, data);
            articleGetSingleTagsSpan.textContent = data.tags_names && data.tags_names.length > 0 ? data.tags_names.join(', ') : 'None';
        }
    });

    // POST /api/articles
    articleCreateBtn.addEventListener('click', async () => {
        const title = articleCreateTitle.value.trim();
        const content = articleCreateContent.value.trim();
        const image_url = articleCreateImage.value.trim();

        if (!title || !content) {
            displayResponse(articleCreateResponse, { error: 'Title and Content are required.' });
            return;
        }

        const body = { title, content };
        if (image_url) {
            body.image_url = image_url;
        }
        const language_code = articleCreateLang.value; // Get selected language
        if (language_code) {
            body.language_code = language_code;
        }
        const tagsInput = articleCreateTagsInput.value.trim();
        if (tagsInput) {
            body.tags = tagsInput.split(',').map(tag => tag.trim());
        }

        const data = await apiRequest('/api/articles', 'POST', body, true);
        displayResponse(articleCreateResponse, data);
    });

    // PUT /api/articles/:id
    articleUpdateBtn.addEventListener('click', async () => {
        const articleId = articleUpdateId.value.trim();
        const title = articleUpdateTitle.value.trim();
        const content = articleUpdateContent.value.trim();
        const image_url = articleUpdateImage.value.trim();

        if (!articleId) {
            displayResponse(articleUpdateResponse, { error: 'Article ID is required.' });
            return;
        }

        const body = { title, content }; // Always send title and content
        if (image_url) body.image_url = image_url;
        const language_code = articleUpdateLang.value; // Get selected language
        if (language_code) {
            body.language_code = language_code;
        }
        const tagsInput = articleUpdateTagsInput.value.trim();
        if (tagsInput) {
            body.tags = tagsInput.split(',').map(tag => tag.trim());
        }

        if (Object.keys(body).length === 0) {
            displayResponse(articleUpdateResponse, { error: 'Please provide at least one field to update (Title, Content, or Image URL).' });
            return;
        }

        const data = await apiRequest(`/api/articles/${articleId}`, 'PUT', body, true);
        displayResponse(articleUpdateResponse, data);
    });

    // DELETE /api/articles/:id
    articleDeleteBtn.addEventListener('click', async () => {
        const articleId = articleDeleteId.value.trim();
        if (!articleId) {
            displayResponse(articleDeleteResponse, { error: 'Please enter an Article ID.' });
            return;
        }
        const data = await apiRequest(`/api/articles/${articleId}`, 'DELETE', null, true);
        displayResponse(articleDeleteResponse, data);
    });

});