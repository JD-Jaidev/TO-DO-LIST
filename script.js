/**
 * TaskFlow — Modern To-Do Web Application
 * Core JavaScript logic and Supabase integration
 * 
 * Strict Vanilla JS, safe DOM manipulation, robust error handling.
 */

// =============================================================================
// 1. Supabase Database Configuration
// =============================================================================

/**
 * Configure your Supabase Project URL and Public Anon Key below:
 * 
 * ⚠️ SECURITY NOTE:
 * - Only use your PUBLIC 'anon' key here (it is safe to use in client-side code).
 * - NEVER use or expose your 'service_role' secret key in frontend code!
 */
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// In-memory application state
let supabaseClient = null;
let tasks = [];
let currentFilter = 'all'; // 'all' | 'pending' | 'completed'x  x
let isSubmitting = false;
let pendingDeleteTaskId = null;

// =============================================================================
// 2. DOM Elements
// =============================================================================

const elements = {
  // Status indicator
  dbStatusBadge: document.getElementById('db-status-badge'),
  dbStatusText: document.getElementById('db-status-text'),

  // Counters & metric values
  countTotal: document.getElementById('count-total'),
  countPending: document.getElementById('count-pending'),
  countCompleted: document.getElementById('count-completed'),
  badgeAll: document.getElementById('badge-all'),
  badgePending: document.getElementById('badge-pending'),
  badgeCompleted: document.getElementById('badge-completed'),

  // Task input form
  addTaskForm: document.getElementById('add-task-form'),
  taskInput: document.getElementById('task-input'),
  addTaskBtn: document.getElementById('add-task-btn'),
  btnSpinner: document.querySelector('#add-task-btn .btn-spinner'),

  // Filter tabs & toolbar
  filterTabs: document.querySelectorAll('.filter-tab'),
  refreshBtn: document.getElementById('refresh-btn'),

  // Task list states & container
  taskList: document.getElementById('task-list'),
  loadingIndicator: document.getElementById('loading-indicator'),
  emptyState: document.getElementById('empty-state'),
  emptyDescription: document.getElementById('empty-description'),

  // Delete confirmation modal
  deleteModal: document.getElementById('delete-modal'),
  modalTaskPreview: document.getElementById('modal-task-preview'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

  // Toast notifications
  toastContainer: document.getElementById('toast-container')
};

// =============================================================================
// 3. Supabase Client Initialization
// =============================================================================

/**
 * Validates credentials format and creates the Supabase client instance.
 */
function initSupabase() {
  if (!window.supabase) {
    updateDatabaseStatus('error', 'CDN Library Error');
    showToast('Failed to load Supabase library from CDN. Check your internet connection.', 'error');
    return false;
  }

  // Check if credentials have been replaced with real project values
  const isConfigured = 
    SUPABASE_URL && 
    SUPABASE_ANON_KEY && 
    SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' && 
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_URL.startsWith('https://');

  if (!isConfigured) {
    updateDatabaseStatus('error', 'Credentials Required');
    showToast('Set your SUPABASE_URL and SUPABASE_ANON_KEY at the top of script.js', 'info');
    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    updateDatabaseStatus('connected', 'Cloud Connected');
    return true;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    updateDatabaseStatus('error', 'Init Failed');
    showToast(`Initialization error: ${err.message}`, 'error');
    return false;
  }
}

/**
 * Updates the visual status badge in the header.
 * @param {'checking' | 'connected' | 'error'} state
 * @param {string} label
 */
function updateDatabaseStatus(state, label) {
  if (!elements.dbStatusBadge || !elements.dbStatusText) return;

  elements.dbStatusBadge.classList.remove('status-checking', 'status-connected', 'status-error');

  if (state === 'connected') {
    elements.dbStatusBadge.classList.add('status-connected');
  } else if (state === 'error') {
    elements.dbStatusBadge.classList.add('status-error');
  } else {
    elements.dbStatusBadge.classList.add('status-checking');
  }

  elements.dbStatusText.textContent = label;
}

// =============================================================================
// 4. Data Operations (CRUD with Supabase)
// =============================================================================

/**
 * Fetch all tasks from Supabase ordered chronologically (newest first).
 */
async function fetchTasks() {
  if (!supabaseClient) {
    renderTasks();
    return;
  }

  showLoading(true);

  try {
    const { data, error } = await supabaseClient
      .from('tasks')
      .select('id, title, completed, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    tasks = data || [];
    updateDatabaseStatus('connected', 'Cloud Connected');
    renderTasks();
  } catch (err) {
    console.error('Error fetching tasks from Supabase:', err);
    updateDatabaseStatus('error', 'Sync Error');
    showToast(`Failed to load tasks: ${err.message || 'Check database permissions/RLS'}`, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Add a new task to Supabase and update the UI.
 * @param {string} rawTitle
 */
async function addTask(rawTitle) {
  const title = (rawTitle || '').trim();

  // Validate non-empty and non-whitespace
  if (!title) {
    showToast('Task title cannot be empty.', 'error');
    elements.taskInput.focus();
    return;
  }

  if (!supabaseClient) {
    showToast('Supabase is not connected. Please add your credentials in script.js', 'error');
    return;
  }

  // Prevent duplicate submissions while operation is pending
  if (isSubmitting) return;
  setSubmittingState(true);

  try {
    const { data, error } = await supabaseClient
      .from('tasks')
      .insert([{ title, completed: false }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      // Add the new task to the top of the list
      tasks.unshift(data);
      renderTasks();
      elements.taskInput.value = '';
      showToast('Task added successfully!', 'success');
    }
  } catch (err) {
    console.error('Error inserting task:', err);
    showToast(`Failed to add task: ${err.message}`, 'error');
  } finally {
    setSubmittingState(false);
    elements.taskInput.focus();
  }
}

/**
 * Toggle task completion status with optimistic UI updates.
 * @param {string} taskId
 * @param {boolean} currentStatus
 */
async function toggleTaskStatus(taskId, currentStatus) {
  if (!supabaseClient) {
    showToast('Supabase is not connected.', 'error');
    return;
  }

  const nextStatus = !currentStatus;

  // Optimistic UI update
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  const previousStatus = tasks[taskIndex].completed;
  tasks[taskIndex].completed = nextStatus;
  renderTasks();

  try {
    const { error } = await supabaseClient
      .from('tasks')
      .update({ completed: nextStatus })
      .eq('id', taskId);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error updating task:', err);
    // Rollback to previous state on failure
    tasks[taskIndex].completed = previousStatus;
    renderTasks();
    showToast(`Failed to update status: ${err.message}`, 'error');
  }
}

/**
 * Delete a task permanently from the Supabase database.
 * @param {string} taskId
 */
async function deleteTask(taskId) {
  if (!supabaseClient) {
    showToast('Supabase is not connected.', 'error');
    return;
  }

  // Set modal confirm button loading state
  const confirmBtn = elements.confirmDeleteBtn;
  const spinner = confirmBtn.querySelector('.btn-spinner');
  confirmBtn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');

  try {
    const { error } = await supabaseClient
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      throw error;
    }

    // Remove task from local state
    tasks = tasks.filter(t => t.id !== taskId);
    closeDeleteModal();
    renderTasks();
    showToast('Task deleted successfully.', 'info');
  } catch (err) {
    console.error('Error deleting task:', err);
    showToast(`Failed to delete task: ${err.message}`, 'error');
  } finally {
    confirmBtn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    pendingDeleteTaskId = null;
  }
}

// =============================================================================
// 5. UI Rendering & Safe DOM Manipulation
// =============================================================================

/**
 * Re-renders the task list according to currentFilter.
 * Safe DOM methods only: document.createElement and textContent.
 */
function renderTasks() {
  const listElement = elements.taskList;
  listElement.innerHTML = ''; // Clear container

  updateCounters();

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter(task => {
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Handle empty state visibility and copy
  if (filteredTasks.length === 0) {
    elements.emptyState.classList.remove('hidden');
    if (currentFilter === 'pending') {
      elements.emptyDescription.textContent = 'No pending tasks left. Great job!';
    } else if (currentFilter === 'completed') {
      elements.emptyDescription.textContent = 'No completed tasks yet. Finish a task to see it here.';
    } else {
      elements.emptyDescription.textContent = 'No tasks found. Add your first task above to get started.';
    }
  } else {
    elements.emptyState.classList.add('hidden');
  }

  // Build task elements
  filteredTasks.forEach(task => {
    const taskItem = createTaskElement(task);
    listElement.appendChild(taskItem);
  });
}

/**
 * Safely constructs a single task list item element.
 * ⚠️ Prevents XSS by strictly inserting task.title via .textContent.
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'completed' : ''}`;
  li.setAttribute('data-id', task.id);

  // Left side: Checkbox button and title
  const taskMain = document.createElement('div');
  taskMain.className = 'task-main';

  // Checkbox button
  const checkboxBtn = document.createElement('button');
  checkboxBtn.type = 'button';
  checkboxBtn.className = 'custom-checkbox';
  checkboxBtn.setAttribute('aria-label', task.completed ? 'Mark task as pending' : 'Mark task as complete');
  checkboxBtn.setAttribute('title', task.completed ? 'Mark as pending' : 'Mark as complete');

  // Checkmark icon
  checkboxBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  checkboxBtn.addEventListener('click', () => {
    toggleTaskStatus(task.id, task.completed);
  });

  // Text content wrapper
  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  // Safe title text node
  const titleSpan = document.createElement('span');
  titleSpan.className = 'task-title-text';
  titleSpan.textContent = task.title; // Safe plain text assignment

  // Timestamp
  const dateSpan = document.createElement('span');
  dateSpan.className = 'task-date';
  dateSpan.textContent = formatTaskDate(task.created_at);

  contentDiv.appendChild(titleSpan);
  contentDiv.appendChild(dateSpan);

  taskMain.appendChild(checkboxBtn);
  taskMain.appendChild(contentDiv);

  // Right side: Delete action button
  const taskActions = document.createElement('div');
  taskActions.className = 'task-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'task-delete-btn';
  deleteBtn.setAttribute('title', 'Delete task');
  deleteBtn.setAttribute('aria-label', `Delete task: ${task.title}`);

  deleteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;

  deleteBtn.addEventListener('click', () => {
    openDeleteModal(task.id, task.title);
  });

  taskActions.appendChild(deleteBtn);

  li.appendChild(taskMain);
  li.appendChild(taskActions);

  return li;
}

/**
 * Formats a timestamp into a human-friendly date string.
 */
function formatTaskDate(dateString) {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Updates the counts displayed across metric cards and tab badges.
 */
function updateCounters() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  elements.countTotal.textContent = total;
  elements.countPending.textContent = pending;
  elements.countCompleted.textContent = completed;

  elements.badgeAll.textContent = total;
  elements.badgePending.textContent = pending;
  elements.badgeCompleted.textContent = completed;
}

/**
 * Shows or hides the loading spinner.
 */
function showLoading(show) {
  if (show) {
    elements.loadingIndicator.classList.remove('hidden');
  } else {
    elements.loadingIndicator.classList.add('hidden');
  }
}

/**
 * Toggles form submission busy state to prevent duplicates.
 */
function setSubmittingState(submitting) {
  isSubmitting = submitting;
  elements.addTaskBtn.disabled = submitting;
  elements.taskInput.disabled = submitting;

  if (elements.btnSpinner) {
    if (submitting) {
      elements.btnSpinner.classList.remove('hidden');
    } else {
      elements.btnSpinner.classList.add('hidden');
    }
  }
}

// =============================================================================
// 6. Delete Confirmation Modal
// =============================================================================

function openDeleteModal(taskId, taskTitle) {
  pendingDeleteTaskId = taskId;
  elements.modalTaskPreview.textContent = `"${taskTitle}"`;
  elements.deleteModal.classList.remove('hidden');
  elements.cancelDeleteBtn.focus();
}

function closeDeleteModal() {
  elements.deleteModal.classList.add('hidden');
  elements.modalTaskPreview.textContent = '';
  pendingDeleteTaskId = null;
}

// =============================================================================
// 7. Toast Alerts
// =============================================================================

/**
 * Renders a lightweight toast notification.
 * @param {string} message
 * @param {'success' | 'error' | 'info'} type
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const messageSpan = document.createElement('span');
  messageSpan.className = 'toast-message';
  messageSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => removeToast(toast));

  toast.appendChild(messageSpan);
  toast.appendChild(closeBtn);
  elements.toastContainer.appendChild(toast);

  // Auto-dismiss after 4.5 seconds
  setTimeout(() => {
    removeToast(toast);
  }, 4500);
}

function removeToast(toast) {
  toast.classList.add('toast-hide');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 220);
}

// =============================================================================
// 8. Event Listeners & Setup
// =============================================================================

function attachEventListeners() {
  // Add task form submit (handles both Add Task button and Enter key)
  elements.addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(elements.taskInput.value);
  });

  // Filter tabs
  elements.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Refresh tasks button
  elements.refreshBtn.addEventListener('click', () => {
    fetchTasks();
    showToast('Refreshing tasks from Supabase...', 'info');
  });

  // Delete modal buttons
  elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteTaskId) {
      deleteTask(pendingDeleteTaskId);
    }
  });

  // Close modal when clicking backdrop
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) {
      closeDeleteModal();
    }
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!elements.deleteModal.classList.contains('hidden')) {
        closeDeleteModal();
      }
    }
  });
}

// =============================================================================
// 9. Application Entry Point
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  attachEventListeners();

  const isReady = initSupabase();
  if (isReady) {
    fetchTasks();
  } else {
    renderTasks();
  }
});
