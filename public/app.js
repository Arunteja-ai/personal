(function () {
  const state = {
    authMode: "login",
    token: localStorage.getItem("pm_token") || "",
    user: null,
    todos: [],
    meals: [],
    goals: [],
  };

  const elements = {
    body: document.body,
    heroDate: document.getElementById("heroDate"),
    authForm: document.getElementById("authForm"),
    authName: document.getElementById("authName"),
    authEmail: document.getElementById("authEmail"),
    authPassword: document.getElementById("authPassword"),
    authSubmit: document.getElementById("authSubmit"),
    authStatus: document.getElementById("authStatus"),
    authTabs: Array.from(document.querySelectorAll(".auth-tab")),
    workspaceTitle: document.getElementById("workspaceTitle"),
    refreshButton: document.getElementById("refreshButton"),
    logoutButton: document.getElementById("logoutButton"),
    workspaceStatus: document.getElementById("workspaceStatus"),
    todoCount: document.getElementById("todoCount"),
    mealCount: document.getElementById("mealCount"),
    goalCount: document.getElementById("goalCount"),
    todoForm: document.getElementById("todoForm"),
    todoText: document.getElementById("todoText"),
    todoPriority: document.getElementById("todoPriority"),
    todoCategory: document.getElementById("todoCategory"),
    mealForm: document.getElementById("mealForm"),
    mealName: document.getElementById("mealName"),
    mealCalories: document.getElementById("mealCalories"),
    mealTime: document.getElementById("mealTime"),
    mealType: document.getElementById("mealType"),
    goalForm: document.getElementById("goalForm"),
    goalTitle: document.getElementById("goalTitle"),
    goalDescription: document.getElementById("goalDescription"),
    goalProgress: document.getElementById("goalProgress"),
    goalDeadline: document.getElementById("goalDeadline"),
    goalPriority: document.getElementById("goalPriority"),
    goalType: document.getElementById("goalType"),
    todoList: document.getElementById("todoList"),
    mealList: document.getElementById("mealList"),
    goalList: document.getElementById("goalList"),
  };

  function setStatus(node, message, tone) {
    node.textContent = message || "";
    node.classList.remove("is-error", "is-success");
    if (tone) {
      node.classList.add(tone === "error" ? "is-error" : "is-success");
    }
  }

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function tomorrow() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  }

  function currentTime() {
    const date = new Date();
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function formatLongDate() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date());
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function summarizeError(payload, fallback) {
    if (!payload) {
      return fallback;
    }
    if (payload.error) {
      return payload.error;
    }
    if (payload.errors) {
      return Object.values(payload.errors).join(" ");
    }
    return fallback;
  }

  async function api(path, options) {
    const request = { method: "GET", ...options };
    const headers = new Headers(request.headers || {});
    if (!headers.has("Content-Type") && request.body) {
      headers.set("Content-Type", "application/json");
    }
    if (state.token) {
      headers.set("Authorization", `Bearer ${state.token}`);
    }

    const response = await fetch(path, { ...request, headers });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(summarizeError(payload, "Request failed."));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    elements.body.dataset.authMode = mode;
    elements.authSubmit.textContent = mode === "register" ? "Create Account" : "Login";
    elements.authTabs.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.authMode === mode);
    });
    setStatus(elements.authStatus, "", null);
  }

  function saveSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem("pm_token", token);
  }

  function clearSession(message) {
    state.token = "";
    state.user = null;
    state.todos = [];
    state.meals = [];
    state.goals = [];
    localStorage.removeItem("pm_token");
    renderWorkspace();
    if (message) {
      setStatus(elements.workspaceStatus, message, "success");
    }
  }

  function requireLogin() {
    if (state.token) {
      return true;
    }
    setStatus(elements.workspaceStatus, "Login or register to use the dashboard.", "error");
    document.getElementById("auth").scrollIntoView({ behavior: "smooth", block: "start" });
    return false;
  }

  function renderEmptyState(message) {
    return `<li class="item item-empty"><div class="item-content"><span class="item-meta">${escapeHtml(message)}</span></div></li>`;
  }

  function renderWorkspace() {
    elements.workspaceTitle.textContent = state.user
      ? `${state.user.name}'s live dashboard`
      : "Open your live dashboard.";

    elements.todoCount.textContent = String(state.todos.length);
    elements.mealCount.textContent = String(state.meals.length);
    elements.goalCount.textContent = String(state.goals.length);

    elements.todoList.innerHTML = state.todos.length
      ? state.todos.map((todo) => `
          <li class="item${todo.done ? " is-done" : ""}">
            <div class="item-content">
              <span class="item-title">${escapeHtml(todo.text)}</span>
              <span class="item-meta">${escapeHtml(todo.category)} · ${escapeHtml(todo.priority)} priority</span>
            </div>
            <div class="item-actions">
              ${todo.done ? '<span class="done-badge">Done</span>' : ""}
              <button class="tiny-button" type="button" data-action="toggle-todo" data-id="${todo.id}">${todo.done ? "Undo" : "Done"}</button>
              <button class="tiny-button" type="button" data-action="delete-todo" data-id="${todo.id}">Delete</button>
            </div>
          </li>
        `).join("")
      : renderEmptyState("No todos yet. Add the first one above.");

    elements.mealList.innerHTML = state.meals.length
      ? state.meals.map((meal) => `
          <li class="item">
            <div class="item-content">
              <span class="item-title">${escapeHtml(meal.name)}</span>
              <span class="item-meta">${escapeHtml(meal.meal_type)} · ${escapeHtml(meal.meal_time)} · ${escapeHtml(String(meal.calories))} cal</span>
            </div>
            <div class="item-actions">
              <button class="tiny-button" type="button" data-action="delete-meal" data-id="${meal.id}">Delete</button>
            </div>
          </li>
        `).join("")
      : renderEmptyState("No meals logged for today yet.");

    elements.goalList.innerHTML = state.goals.length
      ? state.goals.map((goal) => `
          <li class="item">
            <div class="item-content">
              <span class="item-title">${escapeHtml(goal.title)}</span>
              <span class="item-copy">${escapeHtml(goal.description || "No description added yet.")}</span>
              <span class="item-meta">${escapeHtml(goal.goal_type)} term · ${escapeHtml(goal.priority)} priority · Due ${escapeHtml(goal.deadline)}</span>
            </div>
            <div class="item-actions">
              <span class="done-badge">${escapeHtml(String(goal.progress))}%</span>
              <button class="tiny-button" type="button" data-action="boost-goal" data-id="${goal.id}" data-progress="${goal.progress}">+10%</button>
              <button class="tiny-button" type="button" data-action="delete-goal" data-id="${goal.id}">Delete</button>
            </div>
          </li>
        `).join("")
      : renderEmptyState("No goals yet. Create one to track progress.");
  }

  async function loadDashboard(statusMessage) {
    if (!state.token) {
      renderWorkspace();
      return;
    }

    try {
      const [profile, todos, meals, goals] = await Promise.all([
        api("/api/auth/me"),
        api("/api/todos"),
        api(`/api/meals?date=${today()}`),
        api("/api/goals"),
      ]);

      state.user = profile.user;
      state.todos = todos.data || [];
      state.meals = meals.data || [];
      state.goals = goals.data || [];

      renderWorkspace();
      setStatus(
        elements.workspaceStatus,
        statusMessage || `Connected as ${profile.user.email}.`,
        "success"
      );
    } catch (error) {
      if (error.status === 401) {
        clearSession("Your session expired. Please login again.");
        return;
      }
      renderWorkspace();
      setStatus(elements.workspaceStatus, error.message, "error");
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const isRegister = state.authMode === "register";
    const payload = {
      email: elements.authEmail.value.trim(),
      password: elements.authPassword.value,
    };

    if (isRegister) {
      payload.name = elements.authName.value.trim();
    }

    const originalLabel = elements.authSubmit.textContent;
    elements.authSubmit.disabled = true;
    elements.authSubmit.textContent = "Please wait...";
    setStatus(elements.authStatus, "", null);

    try {
      const response = await api(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      saveSession(response.token, response.user);
      elements.authForm.reset();
      elements.mealTime.value = currentTime();
      elements.goalDeadline.value = tomorrow();
      setStatus(
        elements.authStatus,
        isRegister ? "Account created. Dashboard is ready." : "Login successful.",
        "success"
      );
      await loadDashboard();
      document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(elements.authStatus, error.message, "error");
    } finally {
      elements.authSubmit.disabled = false;
      elements.authSubmit.textContent = originalLabel;
    }
  }

  async function createTodo(event) {
    event.preventDefault();
    if (!requireLogin()) {
      return;
    }

    try {
      await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text: elements.todoText.value.trim(),
          priority: elements.todoPriority.value,
          category: elements.todoCategory.value,
        }),
      });
      elements.todoForm.reset();
      elements.todoPriority.value = "medium";
      elements.todoCategory.value = "Personal";
      await loadDashboard("Todo saved.");
    } catch (error) {
      setStatus(elements.workspaceStatus, error.message, "error");
    }
  }

  async function createMeal(event) {
    event.preventDefault();
    if (!requireLogin()) {
      return;
    }

    try {
      await api("/api/meals", {
        method: "POST",
        body: JSON.stringify({
          name: elements.mealName.value.trim(),
          calories: Number(elements.mealCalories.value),
          meal_time: elements.mealTime.value,
          meal_type: elements.mealType.value,
          meal_date: today(),
        }),
      });
      elements.mealForm.reset();
      elements.mealTime.value = currentTime();
      elements.mealType.value = "Lunch";
      await loadDashboard("Meal logged.");
    } catch (error) {
      setStatus(elements.workspaceStatus, error.message, "error");
    }
  }

  async function createGoal(event) {
    event.preventDefault();
    if (!requireLogin()) {
      return;
    }

    try {
      await api("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          title: elements.goalTitle.value.trim(),
          description: elements.goalDescription.value.trim(),
          progress: Number(elements.goalProgress.value),
          deadline: elements.goalDeadline.value,
          priority: elements.goalPriority.value,
          goal_type: elements.goalType.value,
        }),
      });
      elements.goalForm.reset();
      elements.goalProgress.value = "0";
      elements.goalPriority.value = "medium";
      elements.goalType.value = "short";
      elements.goalDeadline.value = tomorrow();
      await loadDashboard("Goal created.");
    } catch (error) {
      setStatus(elements.workspaceStatus, error.message, "error");
    }
  }

  async function handleListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !requireLogin()) {
      return;
    }

    const { action, id } = button.dataset;

    try {
      if (action === "toggle-todo") {
        await api(`/api/todos/${id}/done`, { method: "PATCH" });
        await loadDashboard("Todo updated.");
        return;
      }

      if (action === "delete-todo") {
        await api(`/api/todos/${id}`, { method: "DELETE" });
        await loadDashboard("Todo deleted.");
        return;
      }

      if (action === "delete-meal") {
        await api(`/api/meals/${id}`, { method: "DELETE" });
        await loadDashboard("Meal deleted.");
        return;
      }

      if (action === "delete-goal") {
        await api(`/api/goals/${id}`, { method: "DELETE" });
        await loadDashboard("Goal deleted.");
        return;
      }

      if (action === "boost-goal") {
        const current = Number(button.dataset.progress || 0);
        const nextProgress = Math.min(100, current + 10);
        await api(`/api/goals/${id}/progress`, {
          method: "PATCH",
          body: JSON.stringify({ progress: nextProgress }),
        });
        await loadDashboard("Goal progress updated.");
      }
    } catch (error) {
      setStatus(elements.workspaceStatus, error.message, "error");
    }
  }

  async function restoreSession() {
    if (!state.token) {
      renderWorkspace();
      return;
    }
    await loadDashboard();
  }

  function init() {
    elements.heroDate.textContent = formatLongDate();
    elements.mealTime.value = currentTime();
    elements.goalDeadline.value = tomorrow();

    setAuthMode("login");
    renderWorkspace();

    elements.authTabs.forEach((button) => {
      button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
    });

    elements.authForm.addEventListener("submit", handleAuthSubmit);
    elements.todoForm.addEventListener("submit", createTodo);
    elements.mealForm.addEventListener("submit", createMeal);
    elements.goalForm.addEventListener("submit", createGoal);
    elements.todoList.addEventListener("click", handleListClick);
    elements.mealList.addEventListener("click", handleListClick);
    elements.goalList.addEventListener("click", handleListClick);
    elements.refreshButton.addEventListener("click", () => loadDashboard("Dashboard refreshed."));
    elements.logoutButton.addEventListener("click", () => {
      clearSession("Logged out.");
      setStatus(elements.authStatus, "Session cleared.", "success");
    });

    restoreSession();
  }

  init();
})();
