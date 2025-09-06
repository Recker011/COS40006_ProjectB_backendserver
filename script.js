document.addEventListener('DOMContentLoaded', () => {
    // Dashboard Elements
    const serverLogsElement = document.getElementById('server-logs');
    const userInputElement = document.getElementById('user-input');
    const sendCommandButton = document.getElementById('send-command');
    const serverResponseElement = document.getElementById('server-response');

    // API Demonstration Elements
    const healthCheckBtn = document.getElementById('health-check-btn');
    const healthCheckResponse = document.getElementById('health-check-response');

    // Search API Demo Elements
    const searchQ = document.getElementById('search-q');
    const searchTypeArticles = document.getElementById('search-type-articles');
    const searchTypeCategories = document.getElementById('search-type-categories');
    const searchTypeTags = document.getElementById('search-type-tags');
    const searchLang = document.getElementById('search-lang');
    const searchLimit = document.getElementById('search-limit');
    const searchPage = document.getElementById('search-page');
    const searchIncludeCounts = document.getElementById('search-includeCounts');
    const searchExecBtn = document.getElementById('search-exec-btn');
    const searchResponse = document.getElementById('search-response');

    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const loginResponse = document.getElementById('login-response');
    const currentTokenSpan = document.getElementById('current-token');

    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerDisplayName = document.getElementById('register-display-name');
    const registerBtn = document.getElementById('register-btn');
    const registerResponse = document.getElementById('register-response');

    const logoutBtn = document.getElementById('logout-btn');
    const logoutResponse = document.getElementById('logout-response');

    const profileGetBtn = document.getElementById('profile-get-btn');
    const profileGetResponse = document.getElementById('profile-get-response');

    const profileUpdateDisplayName = document.getElementById('profile-update-display-name');
    const profileUpdateBtn = document.getElementById('profile-update-btn');
    const profileUpdateResponse = document.getElementById('profile-update-response');

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


    // Unit Test Elements
    const runAllTestsBtn = document.getElementById('run-all-tests-btn');
    const allTestsResponse = document.getElementById('all-tests-response');

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

    // GET /api/search
    searchExecBtn?.addEventListener('click', async () => {
        const q = (searchQ?.value || '').trim();
        if (!q) {
            displayResponse(searchResponse, { error: 'q is required' });
            return;
        }
        const types = [];
        if (searchTypeArticles?.checked) types.push('articles');
        if (searchTypeCategories?.checked) types.push('categories');
        if (searchTypeTags?.checked) types.push('tags');

        const params = new URLSearchParams();
        params.set('q', q);
        // Only set types when not all selected to keep URL concise (API defaults to all)
        if (types.length > 0 && types.length < 3) {
            params.set('types', types.join(','));
        }
        const lang = searchLang?.value || 'en';
        if (lang) params.set('lang', lang);
        const lim = parseInt(searchLimit?.value, 10);
        if (!Number.isNaN(lim) && lim > 0) params.set('limit', String(lim));
        const pg = parseInt(searchPage?.value, 10);
        if (!Number.isNaN(pg) && pg > 0) params.set('page', String(pg));
        if (searchIncludeCounts?.checked) params.set('includeCounts', 'true');

        const endpoint = `/api/search?${params.toString()}`;
        const data = await apiRequest(endpoint);
        displayResponse(searchResponse, data);
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

    // POST /api/auth/register
    registerBtn.addEventListener('click', async () => {
        const email = registerEmail.value;
        const password = registerPassword.value;
        const displayName = registerDisplayName.value;
        const data = await apiRequest('/api/auth/register', 'POST', { email, password, displayName });
        displayResponse(registerResponse, data);
        if (data.ok && data.token) {
            authToken = data.token;
            sessionStorage.setItem('authToken', authToken);
            currentTokenSpan.textContent = authToken.substring(0, 30) + '...';
            addLogEntry(`[${new Date().toLocaleString()}] Registration successful. Token stored.`);
        } else {
            authToken = null;
            sessionStorage.removeItem('authToken');
            currentTokenSpan.textContent = 'None';
            addLogEntry(`[${new Date().toLocaleString()}] Registration failed.`);
        }
    });

    // POST /api/auth/logout
    logoutBtn.addEventListener('click', async () => {
        const data = await apiRequest('/api/auth/logout', 'POST', null, true);
        displayResponse(logoutResponse, data);
        if (data.ok) {
            authToken = null;
            sessionStorage.removeItem('authToken');
            currentTokenSpan.textContent = 'None';
            addLogEntry(`[${new Date().toLocaleString()}] Logout successful. Token cleared.`);
        } else {
            addLogEntry(`[${new Date().toLocaleString()}] Logout failed.`);
        }
    });

    // GET /api/auth/profile
    profileGetBtn.addEventListener('click', async () => {
        const data = await apiRequest('/api/auth/profile', 'GET', null, true);
        displayResponse(profileGetResponse, data);
        if (data.ok) {
            addLogEntry(`[${new Date().toLocaleString()}] Profile retrieved successfully.`);
        } else {
            addLogEntry(`[${new Date().toLocaleString()}] Failed to retrieve profile.`);
        }
    });

    // PUT /api/auth/profile
    profileUpdateBtn.addEventListener('click', async () => {
        const newDisplayName = profileUpdateDisplayName.value.trim();
        if (!newDisplayName) {
            displayResponse(profileUpdateResponse, { error: 'Display name cannot be empty.' });
            return;
        }
        const data = await apiRequest('/api/auth/profile', 'PUT', { display_name: newDisplayName }, true);
        displayResponse(profileUpdateResponse, data);
        if (data.ok) {
            addLogEntry(`[${new Date().toLocaleString()}] Profile display name updated successfully.`);
        } else {
            addLogEntry(`[${new Date().toLocaleString()}] Failed to update profile display name.`);
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

    // Unit Tests
    runAllTestsBtn.addEventListener('click', async () => {
        allTestsResponse.textContent = 'Running tests... This may take a moment.';
        const data = await apiRequest('/api/run-tests', 'POST');
        if (data.ok) {
            allTestsResponse.textContent = data.output;
            addLogEntry(`[${new Date().toLocaleString()}] API tests completed successfully.`);
        } else {
            allTestsResponse.textContent = `Error running tests: ${data.error}`;
            addLogEntry(`[${new Date().toLocaleString()}] API tests failed.`);
        }
    });


});
// --- Suggestions demo (GET /api/search/suggestions) ---
document.addEventListener('DOMContentLoaded', () => {
  // Elements for suggestions demo
  const suggQ = document.getElementById('suggestions-q');
  const suggTypeArticles = document.getElementById('suggestions-type-articles');
  const suggTypeCategories = document.getElementById('suggestions-type-categories');
  const suggTypeTags = document.getElementById('suggestions-type-tags');
  const suggLang = document.getElementById('suggestions-lang');
  const suggLimit = document.getElementById('suggestions-limit');
  const suggPerTypeLimit = document.getElementById('suggestions-perTypeLimit');
  const suggIncludeMeta = document.getElementById('suggestions-includeMeta');
  const suggExecBtn = document.getElementById('suggestions-exec-btn');
  const suggList = document.getElementById('suggestions-list');
  const suggResponse = document.getElementById('suggestions-response');

  // If the section isn't present, no-op
  if (!suggQ || !suggExecBtn || !suggList || !suggResponse) return;

  // Simple debounce utility
  const debounce = (fn, wait = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // HTML escaping then convert <c>..</c> markers to <mark class="hl">..</mark>
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, ch => ESC_MAP[ch]);
  const highlightHTML = (s) =>
    escapeHTML(s || '')
      .replace(/&lt;c&gt;/g, '<mark class="hl">')
      .replace(/&lt;\/c&gt;/g, '</mark>');

  const getSelectedTypes = () => {
    const types = [];
    if (suggTypeArticles?.checked) types.push('articles');
    if (suggTypeCategories?.checked) types.push('categories');
    if (suggTypeTags?.checked) types.push('tags');
    return types;
  };

  // Builds the endpoint with query params
  const buildEndpoint = () => {
    const q = (suggQ.value || '').trim();
    const params = new URLSearchParams();
    params.set('q', q);

    const types = getSelectedTypes();
    // API default includes all; only set when not all selected and not empty
    if (types.length > 0 && types.length < 3) {
      params.set('types', types.join(','));
    }

    const lang = suggLang?.value || 'en';
    if (lang) params.set('lang', lang);

    const lim = parseInt(suggLimit?.value, 10);
    if (!Number.isNaN(lim) && lim > 0) params.set('limit', String(lim));

    const ptl = parseInt(suggPerTypeLimit?.value, 10);
    if (!Number.isNaN(ptl) && ptl > 0) params.set('perTypeLimit', String(ptl));

    if (suggIncludeMeta?.checked) params.set('includeMeta', 'true');

    return `/api/search/suggestions?${params.toString()}`;
  };

  const clearList = () => {
    suggList.innerHTML = '';
  };

  const typeBadge = (t) => {
    const map = { articles: 'Article', categories: 'Category', tags: 'Tag' };
    return map[t] || t;
  };

  // Render a compact list of suggestions
  const renderList = (suggestions = []) => {
    clearList();
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No suggestions';
      suggList.appendChild(li);
      return;
    }

    for (const item of suggestions) {
      const li = document.createElement('li');
      li.className = 'suggestion-item';

      const badge = document.createElement('span');
      badge.className = `suggestion-type suggestion-type--${item.type}`;
      badge.textContent = typeBadge(item.type);

      const main = document.createElement('div');
      main.className = 'suggestion-main';

      // Build label HTML depending on type
      let title = '';
      let subtitle = '';
      if (item.type === 'articles') {
        const titleHL = item.highlight?.title || item.title || '';
        const slugHL = item.highlight?.slug || item.slug || '';
        title = highlightHTML(titleHL);
        subtitle = `/${highlightHTML(slugHL)}`;
      } else if (item.type === 'categories') {
        const nameHL = item.highlight?.name || item.name || '';
        const codeHL = item.highlight?.code || item.code || '';
        title = highlightHTML(nameHL);
        subtitle = `:${highlightHTML(codeHL)}`;
      } else if (item.type === 'tags') {
        const nameHL = item.highlight?.name || item.name || '';
        const codeHL = item.highlight?.code || item.code || '';
        title = highlightHTML(nameHL);
        subtitle = `#${highlightHTML(codeHL)}`;
      } else {
        // Fallback
        title = escapeHTML(item.title || item.name || item.code || JSON.stringify(item));
        subtitle = '';
      }

      const titleEl = document.createElement('div');
      titleEl.className = 'suggestion-title';
      titleEl.innerHTML = title;

      const subEl = document.createElement('div');
      subEl.className = 'suggestion-sub';
      subEl.innerHTML = subtitle;

      main.appendChild(titleEl);
      if (subtitle) main.appendChild(subEl);

      li.appendChild(badge);
      li.appendChild(main);
      suggList.appendChild(li);
    }
  };

  // Uses global apiRequest helper defined earlier in this file
  const runSuggestionsQuery = async (showJSON = false) => {
    const q = (suggQ.value || '').trim();
    if (!q) {
      renderList([]);
      if (showJSON) {
        suggResponse.textContent = JSON.stringify({ error: 'q is required' }, null, 2);
      }
      return;
    }
    const endpoint = buildEndpoint();
    const data = await (window.apiRequest ? window.apiRequest(endpoint) : fetch(endpoint).then(r => r.json()).catch(e => ({ error: e.message })));
    renderList(data?.suggestions || []);
    if (showJSON) {
      const pretty = JSON.stringify(data, null, 2);
      suggResponse.textContent = pretty;
    }
  };

  // Expose apiRequest if not in window scope (ensures compatibility if the helper above changes scope)
  if (!window.apiRequest) {
    window.apiRequest = async (endpoint, method = 'GET', body = null) => {
      const headers = { 'Content-Type': 'application/json' };
      const options = { method, headers };
      if (body) options.body = JSON.stringify(body);
      const resp = await fetch(endpoint, options);
      if (resp.status === 204) return { ok: true, message: 'No Content' };
      return resp.json();
    };
  }

  // Wire events
  suggExecBtn.addEventListener('click', () => runSuggestionsQuery(true));

  const debouncedAuto = debounce(() => runSuggestionsQuery(false), 300);
  suggQ.addEventListener('input', debouncedAuto);
  suggTypeArticles?.addEventListener('change', debouncedAuto);
  suggTypeCategories?.addEventListener('change', debouncedAuto);
  suggTypeTags?.addEventListener('change', debouncedAuto);
  suggLang?.addEventListener('change', debouncedAuto);
  suggLimit?.addEventListener('input', debouncedAuto);
  suggPerTypeLimit?.addEventListener('input', debouncedAuto);
  suggIncludeMeta?.addEventListener('change', debouncedAuto);
});