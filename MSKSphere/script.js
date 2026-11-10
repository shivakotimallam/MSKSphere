// Initialize Supabase client
// Performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      console.log('Performance Metrics:', {
        FCP: perfData.responseStart - perfData.fetchStart,
        LCP: perfData.loadEventEnd - perfData.fetchStart,
        TTI: perfData.domInteractive - perfData.fetchStart
      });
    }
  });
}

if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
  console.error('Supabase config not loaded! Check js/config.js');
  alert('Error: Supabase configuration not loaded. Please ensure js/config.js exists and is being loaded.');
} else {
  try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    alert('Error: Failed to initialize Supabase client. ' + error.message);
  }
}

// Global state
let currentUser = null;
let userProfile = null;
let tasks = [];
let taskCompletions = [];
let currentFilter = 'all';
let editingTaskId = null;
let calendarDate = new Date();
let selectedDate = localDateString(new Date());
let templates = [];
let templateTasks = [];
let userEmoji = localStorage.getItem('userEmoji') || '';
let userMessage = localStorage.getItem('userMessage') || '';
let currentTemplate = null;
let editingTemplateTaskId = null;
let goals = [];
let editingGoalId = null;
let dailyNotes = [];
let accounts = [];
let transactions = [];
let editingTransactionId = null;
let lentMoney = [];

// Time picker state
let timePickerTarget = null; // 'start' or 'end'
let timePickerMode = 'hour'; // 'hour' or 'minute'
let selectedHour = 9;
let selectedMinute = 0;
let isPM = false;

// Utility functions
function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }
}

// Debounce function for performance optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced render tasks for search input
const debouncedRenderTasks = debounce(renderTasks, 300);

// Motivational quotes
const motivationalQuotes = [
  "Discipline is choosing what you want most over what you want now.",
  "Small steps every day lead to big results.",
  "Stay focused. Stay consistent. Keep growing.",
  "Your future is created by what you do today.",
  "Consistency turns goals into achievements."
];
let currentQuoteIndex = 0;

function rotateQuotes() {
  const quoteElement = document.getElementById('authQuote');
  if (!quoteElement) return;

  quoteElement.style.opacity = '0';
  setTimeout(() => {
    currentQuoteIndex = (currentQuoteIndex + 1) % motivationalQuotes.length;
    quoteElement.textContent = motivationalQuotes[currentQuoteIndex];
    quoteElement.style.opacity = '1';
  }, 300);
}

// Initialize quote rotation on auth screen
function initQuoteRotation() {
  setInterval(rotateQuotes, 6000); // Rotate every 6 seconds
}

// Password strength checker
function checkPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  return strength;
}

function updatePasswordStrength(password) {
  const strengthBar = document.querySelector('.strength-bar');
  const strengthText = document.querySelector('.strength-text');
  if (!strengthBar || !strengthText) return;

  const strength = checkPasswordStrength(password);
  const strengthFill = document.createElement('div');
  strengthFill.className = 'strength-fill';

  let width = '0%';
  let color = '#e9ecef';
  let text = 'Password strength';
  let textClass = '';

  if (password.length === 0) {
    width = '0%';
    color = '#e9ecef';
    text = 'Password strength';
  } else if (strength <= 2) {
    width = '33%';
    color = '#dc2626';
    text = 'Weak';
    textClass = 'weak';
  } else if (strength <= 3) {
    width = '66%';
    color = '#d97706';
    text = 'Medium';
    textClass = 'medium';
  } else {
    width = '100%';
    color = '#059669';
    text = 'Strong';
    textClass = 'strong';
  }

  strengthBar.innerHTML = '';
  strengthFill.style.width = width;
  strengthFill.style.background = color;
  strengthBar.appendChild(strengthFill);

  strengthText.textContent = text;
  strengthText.className = 'strength-text ' + textClass;
}

// Password match validation
function checkPasswordMatch() {
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;
  const matchElement = document.getElementById('passwordMatch');
  if (!matchElement) return;

  if (confirmPassword.length === 0) {
    matchElement.textContent = '';
    matchElement.className = 'password-match';
    return;
  }

  if (password === confirmPassword) {
    matchElement.textContent = '✓ Passwords match';
    matchElement.className = 'password-match valid';
  } else {
    matchElement.textContent = '✗ Passwords do not match';
    matchElement.className = 'password-match invalid';
  }
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showAuthError(message) {
  const el = document.getElementById('authError');
  el.textContent = message;
  el.hidden = false;
  document.getElementById('authSuccess').hidden = true;
}

function showAuthSuccess(message) {
  const el = document.getElementById('authSuccess');
  el.textContent = message;
  el.hidden = false;
  document.getElementById('authError').hidden = true;
}

function clearAuthMessages() {
  document.getElementById('authError').hidden = true;
  document.getElementById('authSuccess').hidden = true;
}

function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '👁️';
  } else {
    input.type = 'password';
    button.textContent = '⏿';
  }
}

// Authentication functions
function showAuthMode(mode) {
  clearAuthMessages();
  const login = mode === 'login';
  document.getElementById('loginForm').hidden = !login;
  document.getElementById('signupForm').hidden = login;
  document.getElementById('loginTab').classList.toggle('active', login);
  document.getElementById('signupTab').classList.toggle('active', !login);
}

async function handleSignup(event) {
  
  event.preventDefault();
  clearAuthMessages();

  const fullName = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  

  if (!fullName || !email || password.length < 8) {
    return showAuthError('Please enter your name, a valid email, and a password with at least 8 characters.');
  }
  if (password !== confirmPassword) {
    return showAuthError('Passwords do not match.');
  }

  const submitBtn = event.target.querySelector('.auth-submit');
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<span class="spinner"></span>';

  try {
    
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    

    if (error) throw error;

    if (data.user && !data.session) {
      showAuthSuccess('Account created! Please check your email to confirm your account, then log in.');
      showAuthMode('login');
    } else if (data.session) {
      showAuthSuccess('Account created successfully!');
      await loadUserData();
      enterApp();
    }
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = error.message || 'Failed to create account. Please try again.';

    // Check for rate limit error
    if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('too many requests')) {
      errorMessage = 'Too many signup attempts. Please wait a few minutes and try again.';
    }

    showAuthError(errorMessage);
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = 'Create Account';
  }
}
//--------------------------------------------------------------------login Page
async function handleLogin(event) {
  event.preventDefault();
  clearAuthMessages();

  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const submitBtn = event.target.querySelector('.auth-submit');
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showAuthSuccess('Login successful!');
    await loadUserData();
    enterApp();
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = error.message || 'Login failed. Please check your credentials.';

    // Check for specific error types
    if (errorMessage.toLowerCase().includes('email not confirmed')) {
      errorMessage = 'Please confirm your email address before logging in. Check your inbox for the confirmation link.';
    } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.';
    } else if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('too many requests')) {
      errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
    }

    showAuthError(errorMessage);
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = 'Login';
  }
}
//-----------------------------------------------------------------------FORGOT PASSWORD
async function handleForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return showAuthError('Please enter your email address first.');
  }

  if (!confirm(`Send password reset link to ${email}?`)) {
    return;
  }

  try {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) throw error;

    showAuthSuccess('Password reset link sent! Check your email to reset your password.');
  } catch (error) {
    showAuthError(error.message || 'Failed to send reset link. Please try again.');
  }
}

async function logout() {
  await window.supabase.auth.signOut();
  currentUser = null;
  userProfile = null;
  tasks = [];
  taskCompletions = [];
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('authScreen').hidden = false;
  showAuthMode('login');
  clearAuthMessages();
}

async function loadUserData() {
  // Show loading indicator
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) loadingIndicator.style.display = 'flex';

  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    return;
  }

  currentUser = user;

  // Load profile
  const { data: profile } = await window.supabase
    .from('profiles')
    .select('id,full_name,created_at,updated_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Create profile if it doesn't exist
    const { error: insertError } = await window.supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || ''
      });

    if (insertError) {
      console.error('Failed to create profile:', insertError);
    }

    userProfile = {
      full_name: user.user_metadata?.full_name || '',
      email: user.email
    };
  } else {
    userProfile = profile;
  }

  // Load essential data first (tasks and completions) for faster initial load
  // Only select needed columns to reduce data transfer
  const [tasksData, completionsData, notesData] = await Promise.all([
    window.supabase.from('tasks').select('id,name,priority,repetition,days,due_date').eq('user_id', user.id).order('created_at', { ascending: false }),
    window.supabase.from('task_completions').select('id,task_id,completion_date,completed').eq('user_id', user.id),
    window.supabase.from('daily_notes').select('id,date,note,best_thing,bad_thing').eq('user_id', user.id)
  ]);

  tasks = tasksData.data || [];
  taskCompletions = completionsData.data || [];
  dailyNotes = notesData.data || [];
  
  // Load accounts and transactions (with error handling for tables that don't exist yet)
  try {
    const { data: accountsData } = await window.supabase.from('accounts').select('id,name,type,opening_balance,current_balance').eq('user_id', user.id).order('created_at', { ascending: true });
    accounts = accountsData || [];
  } catch (error) {
    console.log('Accounts table may not exist yet:', error.message);
    accounts = [];
  }
  
  try {
    const { data: transactionsData } = await window.supabase.from('transactions').select('id,transaction_type,amount,category,account_id,date,description').eq('user_id', user.id).order('date', { ascending: false });
    transactions = transactionsData || [];
  } catch (error) {
    console.log('Transactions table may not exist yet:', error.message);
    transactions = [];
  }
  
  // Load pending money
  try {
    const { data: lentData } = await window.supabase.from('pending_money').select('id,type,person_name,amount,date,due_date,description,status,completed_date').eq('user_id', user.id).order('date', { ascending: false });
    lentMoney = lentData || [];
  } catch (error) {
    console.log('Pending money table may not exist yet:', error.message);
    lentMoney = [];
  }

  // Hide loading indicator after essential data is loaded
  if (loadingIndicator) loadingIndicator.style.display = 'none';

  // Load remaining data in background after essential data is loaded
  Promise.all([
    window.supabase.from('templates').select('id,name,icon').eq('user_id', user.id).order('created_at', { ascending: false }),
    window.supabase.from('template_tasks').select('id,template_id,name,start_time,end_time,priority').eq('user_id', user.id).order('start_time', { ascending: true }),
    window.supabase.from('goals').select('id,name,deadline,description,completed').eq('user_id', user.id).order('deadline', { ascending: true })
  ]).then(([templatesData, templateTasksData, goalsData]) => {
    templates = templatesData.data || [];
    templateTasks = templateTasksData.data || [];
    goals = goalsData.data || [];
  }).catch(error => {
    console.error('Error loading background data:', error);
  });

  // Load motivation settings from database
  await loadMotivationSettings();
}

function enterApp() {
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appContainer').style.display = 'flex';

  // Request idle callback for non-critical initialization
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initializeApp());
  } else {
    setTimeout(() => initializeApp(), 0);
  }
}

// Recurrence logic
// Cache for day name lookups to avoid repeated toLocaleDateString calls
const dayNameCache = new Map();

function getDayName(dateString) {
  if (dayNameCache.has(dateString)) {
    return dayNameCache.get(dateString);
  }
  const dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
  dayNameCache.set(dateString, dayName);
  return dayName;
}

function taskAppliesOnDate(task, dateString) {
  // Check if date is before start date
  if (dateString < task.start_date) return false;

  // Check if date is after due date
  if (task.due_date && dateString > task.due_date) return false;

  // Check recurrence type
  if (task.recurrence_type === 'daily') return true;
  if (task.recurrence_type === 'custom') {
    const dayName = getDayName(dateString);
    return (task.custom_days || []).includes(dayName);
  }
  // Once: only on start date
  return dateString === task.start_date;
}

function getDayTasks(dateString) {
  const applicableTasks = tasks.filter(t => taskAppliesOnDate(t, dateString));

  // Create a map for faster completion lookup (O(1) instead of O(n))
  const completionMap = new Map();
  taskCompletions.forEach(c => {
    if (c.completion_date === dateString) {
      completionMap.set(c.task_id, c.completed);
    }
  });

  const dayTasks = applicableTasks.map(task => {
    return {
      id: task.id,
      text: task.title,
      completed: completionMap.get(task.id) || false,
      priority: task.priority || 'medium',
      recurrence_type: task.recurrence_type,
      custom_days: task.custom_days,
      template_icon_snapshot: task.template_icon_snapshot,
      scheduled_start_time: task.scheduled_start_time,
      scheduled_end_time: task.scheduled_end_time
    };
  });

  // Sort by priority (high → medium → low) and then by time
  dayTasks.sort((a, b) => {
    // First sort by completion status (incomplete first)
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    // Then sort by priority (high → medium → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Finally sort by time (earliest first)
    const aTime = a.scheduled_start_time || '23:59';
    const bTime = b.scheduled_start_time || '23:59';
    return aTime.localeCompare(bTime);
  });

  return dayTasks;
}

function getDayStats(dateString) {
  const dayTasks = getDayTasks(dateString);
  const total = dayTasks.length;
  const completed = dayTasks.filter(t => t.completed).length;
  return {
    tasks: dayTasks,
    total,
    completed,
    percentage: total ? Math.round(completed / total * 100) : 0
  };
}

function completionClass(pct) {
  return pct > 75 ? 'green' : pct >= 50 ? 'yellow' : 'red';
}

// Task operations
async function saveTask(taskData) {
  const { data, error } = await window.supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTask(id, taskData) {
  const { data, error } = await window.supabase
    .from('tasks')
    .update(taskData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteTaskFromDB(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function saveTaskCompletion(taskId, dateString, completed) {
  const { data, error } = await supabase
    .from('task_completions')
    .upsert({
      task_id: taskId,
      user_id: currentUser.id,
      completion_date: dateString,
      completed
    }, {
      onConflict: 'task_id,completion_date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// UI Functions
function updateStats() {
  const todays = getDayStats(localDateString());
  document.getElementById('totalTasks').textContent = todays.total;
  document.getElementById('completedTasks').textContent = todays.completed;
  document.getElementById('progressText').textContent = `${todays.percentage}%`;
  document.getElementById('progressFill').style.width = `${todays.percentage}%`;
  document.getElementById('totalStreak').textContent = calculateStreak();
  document.getElementById('totalGoals').textContent = goals.filter(g => !g.completed).length;
  updateConsistencyAnalytics();
  renderConsistencyChart();
}

function updateConsistencyAnalytics() {
  const dates = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dates.push(localDateString(d));
  }

  const values = dates.map(date => getDayStats(date).total ? getDayStats(date).percentage : null);
  const validValues = values.filter(v => v !== null);

  // Calculate average completion
  const avgCompletion = validValues.length > 0
    ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length)
    : 0;

  // Calculate best streak (consecutive days with 75%+ completion)
  let bestStreak = 0;
  let currentStreak = 0;
  values.forEach(v => {
    if (v !== null && v >= 75) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // Calculate consistency score (0-100)
  // Factors: average completion (40%), streak (30%), active days (30%)
  const activeDaysRatio = validValues.length / dates.length;
  const streakBonus = Math.min(bestStreak * 5, 50); // Max 50 points for streak
  const consistencyScore = Math.round(
    (avgCompletion * 0.4) +
    (streakBonus * 0.3) +
    (activeDaysRatio * 100 * 0.3)
  );

  document.getElementById('avgCompletion').textContent = `${avgCompletion}%`;
  document.getElementById('bestStreak').textContent = `${bestStreak} days`;
  document.getElementById('consistencyScore').textContent = consistencyScore;
}



function updateMonthlyOverview() {
  // This function is now replaced by updateAnalytics()
  // Kept for compatibility
  updateAnalytics();
}

function updateProductivityInsights() {
  // This function is no longer needed as we removed the Motivation & Insights section
  // Kept for compatibility but does nothing
}

function calculateStreak() {
  let count = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  while (true) {
    const stats = getDayStats(localDateString(cursor));
    if (!stats.total || stats.percentage <= 75) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function taskMarkup(task, showActions = true, dateString = null) {
  const dateStr = dateString || localDateString();
  const templateIcon = task.template_icon_snapshot || '';
  const scheduledTime = task.scheduled_start_time && task.scheduled_end_time
    ? `${formatTime(task.scheduled_start_time)} - ${formatTime(task.scheduled_end_time)}`
    : '';

  return `<li class="${task.completed ? 'completed' : ''}">
    <div class="task-info">
      <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', '${dateStr}')" aria-label="Mark ${escapeHtml(task.text)} complete">
      <span class="priority-badge priority-${escapeHtml(task.priority || 'medium')}">${escapeHtml(task.priority || 'medium')}</span>
      ${templateIcon ? `<span class="template-icon-badge">${escapeHtml(templateIcon)}</span>` : ''}
      <span class="task-text">${escapeHtml(task.text)}</span>
      ${scheduledTime ? `<span class="template-time-badge">${escapeHtml(scheduledTime)}</span>` : ''}
      ${task.recurrence_type && task.recurrence_type !== 'once' ? `<span class="repetition-badge">${task.recurrence_type === 'daily' ? 'Daily' : (task.custom_days || []).map(d => d.slice(0, 3)).join(', ')}</span>` : ''}
    </div>
    ${showActions ? `<div class="task-actions">
      <button class="complete-btn" onclick="toggleTask('${task.id}', '${dateStr}')">${task.completed ? 'Undo' : 'Complete'}</button>
      <button class="edit-btn" onclick="openEditTaskModal('${task.id}')">Edit</button>
      <button class="delete-btn" onclick="deleteTask('${task.id}')">Delete</button>
    </div>` : ''}
  </li>`;
}

function renderTasks() {
  const search = (document.getElementById('taskSearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('taskDateFilter')?.value || localDateString();
  const todayStr = localDateString();

  let visible = tasks.filter(t => {
    const appliesOnDate = taskAppliesOnDate(t, dateFilter);
    const matchesSearch = (t.title || '').toLowerCase().includes(search);
    const dayTasks = getDayTasks(dateFilter);
    const taskOnDate = dayTasks.find(dt => dt.id === t.id);
    const isCompleted = taskOnDate ? taskOnDate.completed : false;

    if (currentFilter === 'active') return appliesOnDate && matchesSearch && !isCompleted;
    if (currentFilter === 'completed') return matchesSearch && isCompleted;
    return appliesOnDate && matchesSearch;
  });

  visible.sort((a, b) => {
    const aTask = getDayTasks(dateFilter).find(dt => dt.id === a.id);
    const bTask = getDayTasks(dateFilter).find(dt => dt.id === b.id);
    const aCompleted = aTask ? aTask.completed : false;
    const bCompleted = bTask ? bTask.completed : false;

    // First sort by completion status (incomplete first)
    if (aCompleted !== bCompleted) {
      return Number(aCompleted) - Number(bCompleted);
    }

    // Then sort by priority (high → medium → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Finally sort by time (earliest first)
    const aTime = a.scheduled_start_time || '23:59';
    const bTime = b.scheduled_start_time || '23:59';
    return aTime.localeCompare(bTime);
  });

  document.getElementById('taskList').innerHTML = visible.length
    ? visible.map(t => {
        const dayTasks = getDayTasks(dateFilter);
        const task = dayTasks.find(dt => dt.id === t.id) || {
          id: t.id,
          text: t.title,
          completed: false,
          priority: t.priority,
          recurrence_type: t.recurrence_type,
          custom_days: t.custom_days,
          template_icon_snapshot: t.template_icon_snapshot,
          scheduled_start_time: t.scheduled_start_time,
          scheduled_end_time: t.scheduled_end_time
        };
        return taskMarkup(task, true, dateFilter);
      }).join('')
    : '<li class="empty">No tasks found for the selected date. Add a task to get started.</li>';

  const todayTasks = getDayTasks(todayStr);
  // Sort today's tasks by priority and time
  todayTasks.sort((a, b) => {
    // First sort by completion status (incomplete first)
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    // Then sort by priority (high → medium → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Finally sort by time (earliest first)
    const aTime = a.scheduled_start_time || '23:59';
    const bTime = b.scheduled_start_time || '23:59';
    return aTime.localeCompare(bTime);
  });

  document.getElementById('dashboardTaskList').innerHTML = todayTasks.length
    ? todayTasks.slice(0, 6).map(t => taskMarkup(t, false, todayStr)).join('')
    : '<li class="empty">No tasks scheduled for today.</li>';
}

function filterTasks(filter, button) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  button?.classList.add('active');
  renderTasks();
}

// Modal functions
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('taskModalTitle').textContent = 'Add New Task';
  document.getElementById('modalTaskName').value = '';
  document.getElementById('modalTaskPriority').value = 'medium';
  document.getElementById('modalTaskRepetition').value = 'once';
  document.getElementById('modalTaskDueDate').value = '';
  document.querySelectorAll('.days-selector input').forEach(c => c.checked = false);
  toggleCustomDays();
  document.getElementById('taskModal').classList.add('show');
  document.getElementById('modalTaskName').focus();
}

function openEditTaskModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('modalTaskName').value = task.title;
  document.getElementById('modalTaskPriority').value = task.priority || 'medium';
  document.getElementById('modalTaskRepetition').value = task.recurrence_type || 'once';
  document.getElementById('modalTaskDueDate').value = task.due_date || '';
  document.querySelectorAll('.days-selector input').forEach(c => c.checked = (task.custom_days || []).includes(c.value));
  toggleCustomDays();
  document.getElementById('taskModal').classList.add('show');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('show');
}

function toggleCustomDays() {
  document.getElementById('customDaysGroup').hidden = document.getElementById('modalTaskRepetition').value !== 'custom';
}

async function saveTaskFromModal() {
  const text = document.getElementById('modalTaskName').value.trim();
  const priority = document.getElementById('modalTaskPriority').value;
  const recurrence = document.getElementById('modalTaskRepetition').value;
  const dueDate = document.getElementById('modalTaskDueDate').value || null;
  const customDays = [...document.querySelectorAll('.days-selector input:checked')].map(c => c.value);

  if (!text) return alert('Please enter a task name.');
  if (recurrence === 'custom' && !customDays.length) return alert('Please select at least one day.');

  const saveBtn = document.querySelector('#taskModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Ensure profile exists before saving task
    const { data: existingProfile } = await window.supabase
      .from('profiles')
      .select('id')
      .eq('id', currentUser.id)
      .single();

    if (!existingProfile) {
      
      const { error: insertError } = await window.supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || ''
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        // If insert fails due to RLS, try upsert
        const { error: upsertError } = await window.supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || ''
          }, {
            onConflict: 'id'
          });

        if (upsertError) {
          console.error('Failed to upsert profile:', upsertError);
          throw new Error('Failed to create user profile. Please try logging out and back in.');
        }
      }
    }

    if (editingTaskId !== null) {
      const task = tasks.find(t => t.id === editingTaskId);
      if (task) {
        const updated = await updateTask(editingTaskId, {
          title: text,
          priority,
          recurrence_type: recurrence,
          custom_days: customDays,
          due_date: dueDate
        });
        Object.assign(task, updated);
      }
    } else {
      const newTask = await saveTask({
        user_id: currentUser.id,
        title: text,
        priority,
        recurrence_type: recurrence,
        custom_days: customDays,
        start_date: localDateString(),
        due_date: dueDate
      });
      tasks.unshift(newTask);
    }

    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
    closeTaskModal();
  } catch (error) {
    alert('Failed to save task: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Task';
  }
}

async function toggleTask(taskId, dateString) {
  const dayTasks = getDayTasks(dateString);
  const task = dayTasks.find(t => t.id === taskId);
  if (!task) return;

  const newCompletedState = !task.completed;

  try {
    // Optimistic UI update - update immediately, then sync with server
    const completionIndex = taskCompletions.findIndex(
      c => c.task_id === taskId && c.completion_date === dateString
    );

    if (completionIndex >= 0) {
      taskCompletions[completionIndex].completed = newCompletedState;
    } else {
      taskCompletions.push({
        task_id: taskId,
        completion_date: dateString,
        completed: newCompletedState
      });
    }

    // Update UI immediately
    renderTasks();
    updateStats();
    renderCalendar();
    if (selectedDate === dateString) {
      renderDaySummary(dateString);
    }

    // Then sync with server in background
    await saveTaskCompletion(taskId, dateString, newCompletedState);

    // Show celebration only when completing a task (not unchecking)
    if (newCompletedState) {
      showTaskCelebration();
      checkAllTasksCompleted(dateString);
    }

    // Update analytics if analytics view is active
    const analyticsView = document.getElementById('analyticsView');
    if (analyticsView && analyticsView.classList.contains('active')) {
      updateWeeklyReflection();
      updateDisciplineScore();
      updateMonthlyOverview();
      updateProductivityInsights();
    }
  } catch (error) {
    // Revert on error
    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
    if (selectedDate === dateString) {
      renderDaySummary(dateString);
    }
    alert('Failed to update task: ' + error.message);
  }
}

function showTaskCelebration(isAllComplete = false) {
  const celebration = document.getElementById('taskCelebration');
  const messageEl = document.getElementById('celebrationMessage');

  const messages = isAllComplete
    ? ['Amazing! All your tasks are completed for today!']
    : ['Great work! One more step forward.', 'Well done! Keep your momentum going.', 'Excellent progress!'];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  messageEl.textContent = randomMessage;

  celebration.style.display = 'block';
  celebration.style.animation = 'none';
  celebration.offsetHeight; // Trigger reflow
  celebration.style.animation = 'slideInUp 0.3s ease-out';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    celebration.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      celebration.style.display = 'none';
    }, 300);
  }, 3000);
}

function checkAllTasksCompleted(dateString) {
  const stats = getDayStats(dateString);
  if (stats.total > 0 && stats.completed === stats.total) {
    // All tasks completed - show special celebration
    setTimeout(() => {
      showTaskCelebration(true);
    }, 1000);
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;

  try {
    await deleteTaskFromDB(taskId);
    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
  } catch (error) {
    alert('Failed to delete task: ' + error.message);
  }
}

// View switching
function switchView(view, button) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  button?.classList.add('active');
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

  const viewElement = document.getElementById(`${view}View`);
  if (viewElement) {
    viewElement.classList.add('active');
  }

  // Close mobile menu if open
  closeMobileMenu();

  // Lazy load - only render data when view is activated
  if (view === 'dashboard') {
    updateStats();
  } else if (view === 'tasks') {
    renderTasks();
  } else if (view === 'calendar') {
    renderCalendar();
  } else if (view === 'templates') {
    renderTemplates();
  } else if (view === 'notes') {
    renderNotes();
  } else if (view === 'analytics') {
    updateAnalytics();
  } else if (view === 'goals') {
    renderGoals();
  } else if (view === 'settings') {
    renderProfile();
  }

  const titles = {
    dashboard: ['Dashboard', 'Your daily progress at a glance.'],
    tasks: ['Tasks', 'Plan, manage, and complete your tasks.'],
    calendar: ['Calendar', 'Review your progress day by day.'],
    templates: ['Templates', 'Create and manage reusable timetable templates.'],
    notes: ['Notes', 'Daily reflections and expense tracking.'],
    analytics: ['Analytics', 'Comprehensive personal performance dashboard.'],
    settings: ['Settings', 'Manage your profile and account settings.']
  };

  if (titles[view]) {
    document.getElementById('viewTitle').textContent = titles[view][0];
    document.getElementById('viewSubtitle').textContent = titles[view][1];
  }
}

// Calendar functions
function changeMonth(offset) {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
  renderCalendar();
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById('calendarMonth').textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let markup = names.map(n => `<div class="weekday">${n}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    markup += '<div class="calendar-empty"></div>';
  }

  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const stats = getDayStats(date);
    const today = localDateString();
    const isTodayOrPast = date <= today;

    // Check for goals on this date
    const dayGoals = goals.filter(g => g.deadline === date);
    const hasGoals = dayGoals.length > 0;
    const completedGoals = dayGoals.filter(g => g.completed).length;
    const hasIncompleteGoals = hasGoals && completedGoals < dayGoals.length;

    // Only show percentage for today and past dates
    const color = (isTodayOrPast && stats.total) ? completionClass(stats.percentage) : 'neutral';
    
    // Goal indicator
    let goalIndicator = '';
    if (hasGoals) {
      if (hasIncompleteGoals) {
        goalIndicator = '<span class="calendar-goal-indicator incomplete">🎯</span>';
      } else {
        goalIndicator = '<span class="calendar-goal-indicator completed">✓</span>';
      }
    }

    markup += `<button class="calendar-day ${color} ${date === selectedDate ? 'selected' : ''} ${date === today ? 'today' : ''} ${hasIncompleteGoals ? 'has-goal' : ''}" onclick="selectCalendarDate('${date}')">
      <span>${day}</span>
      ${isTodayOrPast && stats.total ? `<small>${stats.percentage}%</small>` : ''}
      ${goalIndicator}
    </button>`;
  }

  document.getElementById('calendarGrid').innerHTML = markup;

  if (selectedDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
    renderDaySummary(selectedDate);
  }
}

function selectCalendarDate(date) {
  selectedDate = date;
  renderCalendar();
  renderDaySummary(date);
}

function renderDaySummary(date) {
  const stats = getDayStats(date);
  document.getElementById('summaryTitle').textContent = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const pill = document.getElementById('summaryPercentage');
  pill.textContent = stats.total ? `${stats.percentage}% complete` : 'No activity';
  pill.className = `percentage-pill ${stats.total ? completionClass(stats.percentage) : 'neutral'}`;

  // Display goals due on this date
  const dayGoals = goals.filter(g => g.deadline === date);
  const goalsSection = document.getElementById('summaryGoalsSection');
  const goalsText = document.getElementById('summaryGoalsText');
  
  if (dayGoals.length > 0) {
    goalsSection.style.display = 'block';
    goalsText.innerHTML = dayGoals.map(goal => {
      const statusClass = goal.completed ? 'completed' : (goal.deadline < localDateString() ? 'overdue' : 'pending');
      const statusText = goal.completed ? '✓ Completed' : (goal.deadline < localDateString() ? '⚠️ Overdue' : '🎯 Due');
      return `<div class="summary-goal-item ${statusClass}">
        <strong>${escapeHtml(goal.name || 'Unnamed Goal')}</strong>
        <span class="goal-status">${statusText}</span>
        ${goal.description ? `<div class="goal-desc">${escapeHtml(goal.description)}</div>` : ''}
      </div>`;
    }).join('');
  } else {
    goalsSection.style.display = 'none';
    goalsText.innerHTML = '';
  }

  // Load and display daily note sections
  const dailyNote = dailyNotes.find(n => n.note_date === date);
  const noteSection = document.getElementById('summaryNoteSection');
  const noteText = document.getElementById('summaryNoteText');
  const bestThingSection = document.getElementById('summaryBestThingSection');
  const bestThingText = document.getElementById('summaryBestThingText');
  const badThingSection = document.getElementById('summaryBadThingSection');
  const badThingText = document.getElementById('summaryBadThingText');
  const editNoteBtn = document.getElementById('editNoteBtn');

  // Show/hide sections based on content
  const hasNote = dailyNote && dailyNote.note;
  const hasBestThing = dailyNote && dailyNote.best_thing;
  const hasBadThing = dailyNote && dailyNote.bad_thing;
  const hasAnyReflection = hasNote || hasBestThing || hasBadThing;

  if (hasNote) {
    noteSection.style.display = 'block';
    noteText.textContent = dailyNote.note;
  } else {
    noteSection.style.display = 'none';
    noteText.textContent = '';
  }

  if (hasBestThing) {
    bestThingSection.style.display = 'block';
    bestThingText.textContent = dailyNote.best_thing;
  } else {
    bestThingSection.style.display = 'none';
    bestThingText.textContent = '';
  }

  if (hasBadThing) {
    badThingSection.style.display = 'block';
    badThingText.textContent = dailyNote.bad_thing;
  } else {
    badThingSection.style.display = 'none';
    badThingText.textContent = '';
  }

  // Show edit button if any reflection exists
  if (hasAnyReflection) {
    editNoteBtn.style.display = 'inline-block';
  } else {
    editNoteBtn.style.display = 'none';
  }

  if (stats.total) {
    document.getElementById('summaryContent').innerHTML = `
      <div class="summary-stats">
        <span><strong>${stats.completed}</strong> Completed</span>
        <span><strong>${stats.total - stats.completed}</strong> Remaining</span>
        <span><strong>${stats.total}</strong> Total tasks</span>
      </div>
    `;
    document.getElementById('summaryTaskList').innerHTML = stats.tasks.map(t => {
      const templateIcon = t.template_icon_snapshot || '';
      const scheduledTime = t.scheduled_start_time && t.scheduled_end_time
        ? `${formatTime(t.scheduled_start_time)} - ${formatTime(t.scheduled_end_time)}`
        : '';

      return `
      <li class="${t.completed ? 'completed' : ''}">
        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}', '${date}')" aria-label="Mark ${escapeHtml(t.text)} complete">
        <span>${escapeHtml(t.text)}</span>
        ${templateIcon ? `<span class="template-icon-badge">${escapeHtml(templateIcon)}</span>` : ''}
        ${scheduledTime ? `<span class="template-time-badge">${escapeHtml(scheduledTime)}</span>` : ''}
        <span class="priority-badge priority-${escapeHtml(t.priority || 'medium')}">${escapeHtml(t.priority || 'medium')}</span>
      </li>
    `;
    }).join('');
  } else {
    document.getElementById('summaryContent').innerHTML = '<p class="empty-summary">No tasks were recorded for this date.</p>';
    document.getElementById('summaryTaskList').innerHTML = '';
  }
}

async function saveDailyNote() {
  const noteTextarea = document.getElementById('dailyNoteInput');
  const bestThingTextarea = document.getElementById('bestThingInput');
  const badThingTextarea = document.getElementById('badThingInput');
  const dateInput = document.getElementById('notesDateSelect');
  const date = dateInput ? dateInput.value : selectedDate;

  const note = noteTextarea.value.trim();
  const bestThing = bestThingTextarea.value.trim();
  const badThing = badThingTextarea.value.trim();

  if (!date) return;

  const saveBtn = document.querySelector('.save-note-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const existingNote = dailyNotes.find(n => n.note_date === date);

    if (existingNote) {
      // Update existing note
      const { error } = await window.supabase
        .from('daily_notes')
        .update({ note, best_thing: bestThing, bad_thing: badThing })
        .eq('id', existingNote.id);

      if (error) throw error;

      // Update local data
      existingNote.note = note;
      existingNote.best_thing = bestThing;
      existingNote.bad_thing = badThing;
    } else {
      // Create new note (only if at least one field has content)
      if (!note && !bestThing && !badThing) {
        saveBtn.textContent = 'Save Note';
        saveBtn.disabled = false;
        return;
      }

      const { data, error } = await window.supabase
        .from('daily_notes')
        .insert({
          user_id: currentUser.id,
          note_date: date,
          note,
          best_thing: bestThing,
          bad_thing: badThing
        })
        .select()
        .single();

      if (error) throw error;

      dailyNotes.push(data);
    }

    saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save Note';
      saveBtn.disabled = false;
    }, 1500);
  } catch (error) {
    console.error('Failed to save note:', error);
    alert('Failed to save note: ' + error.message);
    saveBtn.textContent = 'Save Note';
    saveBtn.disabled = false;
  }
}

function renderNotes() {
  // Set date selector to today by default
  const dateInput = document.getElementById('notesDateSelect');
  if (dateInput && !dateInput.value) {
    dateInput.value = localDateString();
  }
  loadNoteForDate();
}

function loadNoteForDate() {
  const dateInput = document.getElementById('notesDateSelect');
  const date = dateInput ? dateInput.value : localDateString();

  const dailyNote = dailyNotes.find(n => n.note_date === date);
  const noteTextarea = document.getElementById('dailyNoteInput');
  const bestThingTextarea = document.getElementById('bestThingInput');
  const badThingTextarea = document.getElementById('badThingInput');

  if (noteTextarea) {
    noteTextarea.value = dailyNote ? (dailyNote.note || '') : '';
  }
  if (bestThingTextarea) {
    bestThingTextarea.value = dailyNote ? (dailyNote.best_thing || '') : '';
  }
  if (badThingTextarea) {
    badThingTextarea.value = dailyNote ? (dailyNote.bad_thing || '') : '';
  }
}

function editNoteFromCalendar() {
  // Switch to Notes view
  const notesBtn = document.querySelector('[data-view="notes"]');
  if (notesBtn) {
    switchView('notes', notesBtn);
  }

  // Set the date selector to the selected calendar date
  const dateInput = document.getElementById('notesDateSelect');
  if (dateInput && selectedDate) {
    dateInput.value = selectedDate;
    loadNoteForDate();
  }
}

// Profile/Settings functions
function renderProfile() {
  document.getElementById('profileName').textContent = userProfile?.full_name || currentUser?.user_metadata?.full_name || 'Not set';
  document.getElementById('profileEmail').textContent = userProfile?.email || currentUser?.email || 'Not set';
  document.getElementById('profilePassword').textContent = '••••••••';
}

function openEmailModal() {
  document.getElementById('newEmail').value = currentUser?.email || '';
  document.getElementById('emailConfirmPassword').value = '';
  document.getElementById('emailModal').classList.add('show');
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('show');
}

async function submitEmailChange() {
  const newEmail = document.getElementById('newEmail').value.trim().toLowerCase();
  const password = document.getElementById('emailConfirmPassword').value;

  if (!newEmail || !newEmail.includes('@')) return alert('Enter a valid email address.');
  if (!password) return alert('Please enter your current password for verification.');

  const saveBtn = document.querySelector('#emailModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Updating...';

  try {
    // Verify current password by re-authenticating
    const { error: signInError } = await window.supabase.auth.signInWithPassword({
      email: currentUser.email,
      password
    });

    if (signInError) throw new Error('Current password is incorrect.');

    // Update email
    const { error } = await window.supabase.auth.updateUser({
      email: newEmail
    });

    if (error) throw error;

    alert('Email updated! Please check your new email for verification.');
    closeEmailModal();
    await loadUserData();
    renderProfile();
  } catch (error) {
    alert(error.message || 'Failed to update email.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Email';
  }
}

function openPasswordModal() {
  ['newPassword', 'confirmPassword'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('passwordModal').classList.add('show');
}

function closePasswordModal() {
  document.getElementById('passwordModal').classList.remove('show');
}

function closeResetPasswordModal() {
  document.getElementById('resetPasswordModal').classList.remove('show');
  // Clear URL params
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function submitPasswordReset() {
  const newPassword = document.getElementById('resetNewPassword').value;
  const confirmPassword = document.getElementById('resetConfirmPassword').value;

  if (!newPassword || !confirmPassword) {
    return alert('Please fill in all password fields.');
  }
  if (newPassword.length < 8) {
    return alert('New password must contain at least 8 characters.');
  }
  if (newPassword !== confirmPassword) {
    return alert('New password and confirmation do not match.');
  }

  const saveBtn = document.querySelector('#resetPasswordModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Resetting...';

  try {
    const { error } = await window.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    alert('Password reset successfully! You can now log in with your new password.');
    closeResetPasswordModal();
    clearAuthMessages();
    showAuthMode('login');
  } catch (error) {
    alert(error.message || 'Failed to reset password. Please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Reset Password';
  }
}

async function submitPasswordChange() {
  const next = document.getElementById('newPassword').value;
  const confirmValue = document.getElementById('confirmPassword').value;

  if (!next || !confirmValue) return alert('Please fill in all password fields.');
  if (next.length < 8) return alert('New password must contain at least 8 characters.');
  if (next !== confirmValue) return alert('New password and confirmation do not match.');

  const saveBtn = document.querySelector('#passwordModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Updating...';

  try {
    // Update password
    const { error } = await window.supabase.auth.updateUser({
      password: next
    });

    if (error) throw error;

    alert('Password updated successfully!');
    closePasswordModal();
  } catch (error) {
    alert(error.message || 'Failed to update password.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Password';
  }
}

// Consistency chart
function renderConsistencyChart() {
  const svg = document.getElementById('consistencyChart');
  if (!svg) return;

  const dates = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dates.push(localDateString(d));
  }

  const values = dates.map(date => getDayStats(date).total ? getDayStats(date).percentage : null);

  const width = 640, height = 220, left = 45, right = 20, top = 30, bottom = 45;
  const plotW = width - left - right, plotH = height - top - bottom;
  const y = v => top + (100 - v) / 100 * plotH;
  const x = i => left + (dates.length === 1 ? plotW / 2 : i / (dates.length - 1) * plotW);

  let svgMarkup = '';

  // Simple horizontal grid lines
  [0, 50, 100].forEach(v => {
    if (v > 0) {
      svgMarkup += `<line class="gridline" x1="${left}" y1="${y(v)}" x2="${width - right}" y2="${y(v)}"></line>`;
    }
    svgMarkup += `<text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" fill="#999" font-size="11">${v}%</text>`;
  });

  // Create smooth curve using bezier curves
  const points = values.map((v, i) => v === null ? null : [x(i), y(v)]);
  let svgPath = '';

  if (points.some(p => p !== null)) {
    // Fill area under the curve
    let fillPath = `M ${left} ${y(0)}`;
    let linePath = '';

    points.forEach((p, i) => {
      if (p !== null) {
        if (linePath === '') {
          linePath = `M ${p[0]} ${p[1]}`;
          fillPath += ` L ${p[0]} ${p[1]}`;
        } else {
          // Simple line for now (can be upgraded to bezier for smoother curves)
          linePath += ` L ${p[0]} ${p[1]}`;
          fillPath += ` L ${p[0]} ${p[1]}`;
        }
      }
    });

    const lastNonNull = points.filter(p => p !== null).pop();
    if (lastNonNull) {
      fillPath += ` L ${lastNonNull[0]} ${y(0)} Z`;
      svgMarkup += `<path d="${fillPath}" fill="url(#gradient)" opacity="0.3"></path>`;
    }

    svgMarkup += `<path d="${linePath}" class="chart-line" fill="none"></path>`;

    // Add points
    points.forEach((p, i) => {
      if (p) {
        const value = values[i];
        const color = value > 75 ? '#25D366' : value >= 50 ? '#ffc107' : '#dc3545';
        svgMarkup += `<circle class="chart-point" cx="${p[0]}" cy="${p[1]}" r="6" fill="${color}" stroke="white" stroke-width="2"><title>${dates[i]}: ${value}%</title></circle>`;
      }
    });
  }

  // Date labels
  dates.forEach((date, i) => {
    if (i % 3 === 0 || i === 13) {
      const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      svgMarkup += `<text x="${x(i)}" y="${height - 15}" text-anchor="middle" fill="#999" font-size="11">${label}</text>`;
    }
  });

  // Gradient definition
  svgMarkup += `
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#128C7E;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#128C7E;stop-opacity:0" />
      </linearGradient>
    </defs>
  `;

  if (values.every(v => v === null)) {
    svgMarkup += `<text class="empty-chart" x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#999" font-size="14">Complete tasks to start seeing your consistency trend.</text>`;
  }

  svg.innerHTML = svgMarkup;
}

// Template Functions
function renderTemplates() {
  const container = document.getElementById('templatesList');
  if (!templates.length) {
    container.innerHTML = '<div class="template-empty">No templates yet. Create your first template to get started!</div>';
    return;
  }

  container.innerHTML = templates.map(template => {
    const taskCount = templateTasks.filter(tt => tt.template_id === template.id).length;
    return `
      <div class="template-card" onclick="openTemplateDetail('${template.id}')">
        <div class="template-card-header">
          <span class="template-icon">${escapeHtml(template.icon)}</span>
          <span class="template-name">${escapeHtml(template.name)}</span>
        </div>
        <div class="template-meta">
          <span class="template-task-count">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openTemplateDetail(templateId) {
  currentTemplate = templates.find(t => t.id === templateId);
  if (!currentTemplate) return;

  document.getElementById('templateDetailTitle').textContent = currentTemplate.icon + ' ' + currentTemplate.name;
  document.getElementById('templateDetailSubtitle').textContent = 'Manage your timetable tasks';

  // Hide all views
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  // Show template detail view
  document.getElementById('templateDetailView').classList.add('active');

  renderTemplateTasks();
}

function renderTemplateTasks() {
  if (!currentTemplate) return;

  const tasks = templateTasks.filter(tt => tt.template_id === currentTemplate.id);
  const container = document.getElementById('templateTasksList');

  if (!tasks.length) {
    container.innerHTML = '<div class="empty">No tasks in this template yet. Add your first task!</div>';
    return;
  }

  // Sort by start time
  tasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

  container.innerHTML = tasks.map(task => {
    const priority = task.priority || 'medium';
    const priorityLabel = priority.charAt(0).toUpperCase();
    return `
    <li class="template-task-item">
      <div class="template-task-info">
        <div class="template-task-name">${escapeHtml(task.task_name)}</div>
        <div class="template-task-time">${formatTime(task.start_time)} - ${formatTime(task.end_time)}</div>
        <div class="template-task-days">${(task.selected_days || []).map(d => d.slice(0, 3)).join(', ')}</div>
      </div>
      <div class="template-task-actions">
        <span class="priority-badge priority-${priority}">${priorityLabel}</span>
        <button class="edit-btn" onclick="openEditTemplateTaskModal('${task.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteTemplateTask('${task.id}')">Delete</button>
      </div>
    </li>
  `}).join('');
}

function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function openCreateTemplateModal() {
  document.getElementById('templateName').value = '';
  document.getElementById('selectedIcon').value = '📅';
  document.querySelectorAll('#iconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector('#iconPicker .icon-option[data-icon="📅"]').classList.add('selected');
  document.getElementById('createTemplateModal').classList.add('show');
  document.getElementById('templateName').focus();
}

function closeCreateTemplateModal() {
  document.getElementById('createTemplateModal').classList.remove('show');
}

function selectIcon(icon) {
  document.getElementById('selectedIcon').value = icon;
  document.querySelectorAll('#iconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`#iconPicker .icon-option[data-icon="${icon}"]`).classList.add('selected');
}

async function saveTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const icon = document.getElementById('selectedIcon').value;

  if (!name) return alert('Please enter a template name.');

  const saveBtn = document.querySelector('#createTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Creating...';

  try {
    const { data, error } = await window.supabase
      .from('templates')
      .insert({
        user_id: currentUser.id,
        name,
        icon
      })
      .select()
      .single();

    if (error) throw error;

    templates.unshift(data);
    renderTemplates();
    closeCreateTemplateModal();
  } catch (error) {
    alert('Failed to create template: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Create Template';
  }
}

function openEditTemplateModal() {
  if (!currentTemplate) return;

  document.getElementById('editTemplateName').value = currentTemplate.name;
  document.getElementById('editSelectedIcon').value = currentTemplate.icon;
  document.querySelectorAll('#editIconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  const selectedBtn = document.querySelector(`#editIconPicker .icon-option[data-icon="${currentTemplate.icon}"]`);
  if (selectedBtn) selectedBtn.classList.add('selected');
  document.getElementById('editTemplateModal').classList.add('show');
}

function closeEditTemplateModal() {
  document.getElementById('editTemplateModal').classList.remove('show');
}

function selectEditIcon(icon) {
  document.getElementById('editSelectedIcon').value = icon;
  document.querySelectorAll('#editIconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`#editIconPicker .icon-option[data-icon="${icon}"]`).classList.add('selected');
}

async function updateTemplate() {
  if (!currentTemplate) return;

  const name = document.getElementById('editTemplateName').value.trim();
  const icon = document.getElementById('editSelectedIcon').value;

  if (!name) return alert('Please enter a template name.');

  const saveBtn = document.querySelector('#editTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const { data, error } = await window.supabase
      .from('templates')
      .update({
        name,
        icon
      })
      .eq('id', currentTemplate.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(currentTemplate, data);
    const index = templates.findIndex(t => t.id === currentTemplate.id);
    if (index !== -1) templates[index] = currentTemplate;

    document.getElementById('templateDetailTitle').textContent = currentTemplate.icon + ' ' + currentTemplate.name;
    renderTemplates();
    closeEditTemplateModal();
  } catch (error) {
    alert('Failed to update template: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

async function deleteCurrentTemplate() {
  if (!currentTemplate) return;
  if (!confirm(`Delete template "${currentTemplate.name}"? This will also delete all tasks generated from this template.`)) return;

  try {
    // First, delete all tasks created from this template
    const { error: tasksError } = await window.supabase
      .from('tasks')
      .delete()
      .eq('source_template_id', currentTemplate.id);

    if (tasksError) {
      console.error('Failed to delete tasks from template:', tasksError);
      // Continue with template deletion even if task deletion fails
    }

    // Delete template tasks
    const { error: templateTasksError } = await window.supabase
      .from('template_tasks')
      .delete()
      .eq('template_id', currentTemplate.id);

    if (templateTasksError) {
      console.error('Failed to delete template tasks:', templateTasksError);
    }

    // Delete the template itself
    const { error } = await window.supabase
      .from('templates')
      .delete()
      .eq('id', currentTemplate.id);

    if (error) throw error;

    // Update local data
    tasks = tasks.filter(t => t.source_template_id !== currentTemplate.id);
    templates = templates.filter(t => t.id !== currentTemplate.id);
    templateTasks = templateTasks.filter(tt => tt.template_id !== currentTemplate.id);
    currentTemplate = null;

    // Refresh views
    renderTasks();
    switchView('templates', document.querySelector('[data-view=templates]'));
    renderTemplates();
  } catch (error) {
    alert('Failed to delete template: ' + error.message);
  }
}

function openAddTemplateTaskModal() {
  editingTemplateTaskId = null;
  document.getElementById('templateTaskModalTitle').textContent = 'Add Task to Template';
  document.getElementById('templateTaskName').value = '';
  document.getElementById('templateTaskPriority').value = 'medium';
  document.getElementById('templateTaskStartTime').value = '';
  document.getElementById('templateTaskEndTime').value = '';
  document.querySelectorAll('#addTemplateTaskModal .days-selector input').forEach(c => c.checked = false);
  document.getElementById('templateTaskError').hidden = true;
  document.getElementById('addTemplateTaskModal').classList.add('show');
  document.getElementById('templateTaskName').focus();
}

function closeAddTemplateTaskModal() {
  document.getElementById('addTemplateTaskModal').classList.remove('show');
}

function openEditTemplateTaskModal(taskId) {
  const task = templateTasks.find(tt => tt.id === taskId);
  if (!task) return;

  editingTemplateTaskId = taskId;
  document.getElementById('templateTaskModalTitle').textContent = 'Edit Task';
  document.getElementById('templateTaskName').value = task.task_name;
  document.getElementById('templateTaskPriority').value = task.priority || 'medium';
  document.getElementById('templateTaskStartTime').value = task.start_time;
  document.getElementById('templateTaskEndTime').value = task.end_time;
  document.querySelectorAll('#addTemplateTaskModal .days-selector input').forEach(c => {
    c.checked = (task.selected_days || []).includes(c.value);
  });
  document.getElementById('templateTaskError').hidden = true;
  document.getElementById('addTemplateTaskModal').classList.add('show');
}

async function saveTemplateTask() {
  if (!currentTemplate) return;

  const taskName = document.getElementById('templateTaskName').value.trim();
  const priority = document.getElementById('templateTaskPriority').value;
  const startTime = document.getElementById('templateTaskStartTime').value;
  const endTime = document.getElementById('templateTaskEndTime').value;
  const selectedDays = [...document.querySelectorAll('#addTemplateTaskModal .days-selector input:checked')].map(c => c.value);

  if (!taskName) return alert('Please enter a task name.');
  if (!startTime) return alert('Please select a start time.');
  if (!endTime) return alert('Please select an end time.');
  if (!selectedDays.length) return alert('Please select at least one day.');

  // Validate time range
  if (startTime >= endTime) {
    document.getElementById('templateTaskError').textContent = 'End time must be later than start time.';
    document.getElementById('templateTaskError').hidden = false;
    return;
  }

  // Check for overlapping tasks on the same days
  const existingTasks = templateTasks.filter(tt =>
    tt.template_id === currentTemplate.id &&
    tt.id !== editingTemplateTaskId
  );

  for (const existing of existingTasks) {
    if (!existing.selected_days || !Array.isArray(existing.selected_days)) continue;
    const overlappingDays = existing.selected_days.filter(day => selectedDays.includes(day));
    if (overlappingDays.length > 0) {
      // Check time overlap
      if (!(endTime <= existing.start_time || startTime >= existing.end_time)) {
        document.getElementById('templateTaskError').textContent = `This task overlaps with "${existing.task_name}" on ${overlappingDays.join(', ')}.`;
        document.getElementById('templateTaskError').hidden = false;
        return;
      }
    }
  }

  const saveBtn = document.querySelector('#addTemplateTaskModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingTemplateTaskId) {
      const { data, error } = await window.supabase
        .from('template_tasks')
        .update({
          task_name: taskName,
          priority: priority,
          start_time: startTime,
          end_time: endTime,
          selected_days: selectedDays
        })
        .eq('id', editingTemplateTaskId)
        .select()
        .single();

      if (error) throw error;

      const index = templateTasks.findIndex(tt => tt.id === editingTemplateTaskId);
      if (index !== -1) templateTasks[index] = data;
    } else {
      const { data, error } = await window.supabase
        .from('template_tasks')
        .insert({
          template_id: currentTemplate.id,
          user_id: currentUser.id,
          task_name: taskName,
          priority: priority,
          start_time: startTime,
          end_time: endTime,
          selected_days: selectedDays
        })
        .select()
        .single();

      if (error) throw error;

      templateTasks.push(data);
    }

    renderTemplateTasks();
    renderTemplates();
    closeAddTemplateTaskModal();
  } catch (error) {
    alert('Failed to save task: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Task';
  }
}

async function deleteTemplateTask(taskId) {
  if (!confirm('Delete this task from the template?')) return;

  try {
    const { error } = await window.supabase
      .from('template_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    templateTasks = templateTasks.filter(tt => tt.id !== taskId);
    renderTemplateTasks();
    renderTemplates();
  } catch (error) {
    alert('Failed to delete task: ' + error.message);
  }
}

function openApplyTemplateModal() {
  if (!currentTemplate) return;

  const today = localDateString();
  document.getElementById('applyStartDate').value = today;
  document.getElementById('applyEndDate').value = today;
  document.getElementById('applyRecurrenceType').value = 'once';
  document.getElementById('applyRepeatUntil').value = '';
  document.getElementById('applyTemplatePreview').innerHTML = '';
  document.getElementById('applyTemplateError').hidden = true;
  document.getElementById('applyTemplateModal').classList.add('show');

  toggleApplyRecurrenceOptions();
  // Generate initial preview
  generateApplyPreview();
}

function toggleApplyRecurrenceOptions() {
  const recurrence = document.getElementById('applyRecurrenceType').value;
  const repeatUntilGroup = document.getElementById('applyRepeatUntilGroup');

  if (recurrence === 'once') {
    repeatUntilGroup.hidden = true;
  } else {
    repeatUntilGroup.hidden = false;
  }

  generateApplyPreview();
}

function closeApplyTemplateModal() {
  document.getElementById('applyTemplateModal').classList.remove('show');
}

function openImportTemplateModal() {
  if (!currentTemplate) return;

  // Populate dropdown with other templates
  const select = document.getElementById('importTemplateSelect');
  select.innerHTML = '<option value="">-- Choose a template --</option>';

  templates.filter(t => t.id !== currentTemplate.id).forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = `${template.icon} ${template.name}`;
    select.appendChild(option);
  });

  document.getElementById('importTemplatePreview').innerHTML = '';
  document.getElementById('importTemplateError').hidden = true;
  document.getElementById('importTemplateModal').classList.add('show');

  // Add event listener for template selection
  select.onchange = generateImportPreview;
}

function closeImportTemplateModal() {
  document.getElementById('importTemplateModal').classList.remove('show');
}

function generateImportPreview() {
  const sourceTemplateId = document.getElementById('importTemplateSelect').value;
  if (!sourceTemplateId) {
    document.getElementById('importTemplatePreview').innerHTML = '';
    return;
  }

  const sourceTemplate = templates.find(t => t.id === sourceTemplateId);
  if (!sourceTemplate) return;

  const sourceTasks = templateTasks.filter(tt => tt.template_id === sourceTemplateId);

  if (!sourceTasks.length) {
    document.getElementById('importTemplatePreview').innerHTML = '<p class="empty-summary">This template has no tasks to import.</p>';
    return;
  }

  // Sort by start time
  sourceTasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

  let html = '<h4>Tasks to Import</h4>';
  sourceTasks.forEach(task => {
    html += `<div class="import-preview-item">
      <div class="import-preview-task">
        <span class="import-preview-task-icon">${sourceTemplate.icon}</span>
        <span class="import-preview-task-name">${escapeHtml(task.task_name)}</span>
        <span class="import-preview-task-time">${formatTime(task.start_time)} - ${formatTime(task.end_time)}</span>
      </div>
      <div style="font-size:11px;color:#666;margin-top:4px;">${(task.selected_days || []).map(d => d.slice(0, 3)).join(', ')}</div>
    </div>`;
  });

  html += `<div class="import-summary">Total tasks to import: ${sourceTasks.length}</div>`;
  document.getElementById('importTemplatePreview').innerHTML = html;
}

async function importTemplateTasks() {
  if (!currentTemplate) return;

  const sourceTemplateId = document.getElementById('importTemplateSelect').value;
  if (!sourceTemplateId) return alert('Please select a template to import from.');

  const sourceTemplate = templates.find(t => t.id === sourceTemplateId);
  if (!sourceTemplate) return;

  const sourceTasks = templateTasks.filter(tt => tt.template_id === sourceTemplateId);
  if (!sourceTasks.length) return alert('The selected template has no tasks to import.');

  const saveBtn = document.querySelector('#importTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Importing...';

  try {
    let importedCount = 0;
    let skippedCount = 0;

    for (const task of sourceTasks) {
      // Check for overlapping tasks
      const existingTasks = templateTasks.filter(tt =>
        tt.template_id === currentTemplate.id
      );

      let hasOverlap = false;
      for (const existing of existingTasks) {
        if (!existing.selected_days || !Array.isArray(existing.selected_days)) continue;
        if (!task.selected_days || !Array.isArray(task.selected_days)) continue;
        const overlappingDays = existing.selected_days.filter(day => task.selected_days.includes(day));
        if (overlappingDays.length > 0) {
          if (!(task.end_time <= existing.start_time || task.start_time >= existing.end_time)) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (hasOverlap) {
        skippedCount++;
        continue;
      }

      // Import the task
      const { data, error } = await window.supabase
        .from('template_tasks')
        .insert({
          template_id: currentTemplate.id,
          user_id: currentUser.id,
          task_name: task.task_name,
          priority: task.priority || 'medium',
          start_time: task.start_time,
          end_time: task.end_time,
          selected_days: task.selected_days
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to import task:', error);
        continue;
      }

      if (error) {
        console.error('Failed to import task:', error);
        continue;
      }

      templateTasks.push(data);
      importedCount++;
    }

    await loadUserData();
    renderTemplateTasks();
    renderTemplates();
    closeImportTemplateModal();

    if (skippedCount > 0) {
      alert(`Import complete! ${importedCount} tasks imported. ${skippedCount} tasks were skipped due to time overlaps.`);
    } else {
      alert(`Import complete! ${importedCount} tasks imported successfully.`);
    }
  } catch (error) {
    alert('Failed to import tasks: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Import Tasks';
  }
}

function generateApplyPreview() {
  if (!currentTemplate) return;

  const startDate = document.getElementById('applyStartDate').value;
  const endDate = document.getElementById('applyEndDate').value;

  if (!startDate || !endDate) return;

  if (startDate > endDate) {
    document.getElementById('applyTemplateError').textContent = 'Start date must be before or equal to end date.';
    document.getElementById('applyTemplateError').hidden = false;
    document.getElementById('applyTemplatePreview').innerHTML = '';
    return;
  }

  document.getElementById('applyTemplateError').hidden = true;

  const tasks = templateTasks.filter(tt => tt.template_id === currentTemplate.id);
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(localDateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const preview = {};
  let totalTasks = 0;

  dates.forEach(date => {
    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    const matchingTasks = tasks.filter(task => {
      // Tasks with recurrence_type "once" don't need selected_days
      if (task.recurrence_type === 'once') {
        return true;
      }
      if (!task.selected_days || !Array.isArray(task.selected_days)) {
        console.error('Task has invalid selected_days:', task);
        return false;
      }
      return task.selected_days.includes(dayName);
    });

    if (matchingTasks.length > 0) {
      preview[date] = matchingTasks;
      totalTasks += matchingTasks.length;
    }
  });

  if (totalTasks === 0) {
    document.getElementById('applyTemplatePreview').innerHTML = '<p class="empty-summary">No tasks match the selected dates based on the template schedule.</p>';
    return;
  }

  let html = '<h4>Preview</h4>';
  Object.entries(preview).forEach(([date, tasks]) => {
    const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
    html += `<div class="apply-preview-item">
      <div class="apply-preview-date">${formattedDate}</div>`;
    tasks.forEach(task => {
      html += `<div class="apply-preview-task">
        <span class="apply-preview-task-icon">${currentTemplate.icon}</span>
        <span class="apply-preview-task-name">${escapeHtml(task.task_name)}</span>
        <span class="apply-preview-task-time">${formatTime(task.start_time)} - ${formatTime(task.end_time)}</span>
      </div>`;
    });
    html += '</div>';
  });

  html += `<div class="apply-summary">Total tasks to generate: ${totalTasks}</div>`;
  document.getElementById('applyTemplatePreview').innerHTML = html;
}

// Helper function to check for time overlap
function hasTimeOverlap(newStartTime, newEndTime, existingTask) {
  if (!existingTask.scheduled_start_time || !existingTask.scheduled_end_time) return false;
  // No overlap if new task ends before existing starts or starts after existing ends
  return !(newEndTime <= existingTask.scheduled_start_time || newStartTime >= existingTask.scheduled_end_time);
}

async function applyTemplate() {
  if (!currentTemplate) return;

  const startDate = document.getElementById('applyStartDate').value;
  const endDate = document.getElementById('applyEndDate').value;
  const recurrenceType = document.getElementById('applyRecurrenceType').value;
  const repeatUntil = document.getElementById('applyRepeatUntil').value || null;

  if (!startDate || !endDate) return alert('Please select start and end dates.');
  if (startDate > endDate) return alert('Start date must be before or equal to end date.');

  const templateTasksList = templateTasks.filter(tt => tt.template_id === currentTemplate.id);
  if (!templateTasksList.length) return alert('This template has no tasks to apply.');

  const saveBtn = document.querySelector('#applyTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Checking for conflicts...';

  try {
    // First, check for all conflicts before creating any tasks
    const conflicts = [];

    for (const task of templateTasksList) {
      // Tasks with recurrence_type "once" don't need selected_days
      if (task.recurrence_type !== 'once' && (!task.selected_days || !Array.isArray(task.selected_days))) {
        console.error('Task has invalid selected_days:', task);
        continue;
      }

      if (recurrenceType === 'once') {
        // One-time: Check for overlaps on matching dates
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
          const dateStr = localDateString(currentDate);
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          if (task.selected_days && task.selected_days.includes(dayName)) {
            dates.push(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const date of dates) {
          // Check if task already exists (from this template)
          const existingTask = tasks.find(t =>
            t.task_source === 'template' &&
            t.source_template_task_id === task.id &&
            t.start_date === date
          );

          if (existingTask) {
            conflicts.push({
              templateTask: task.task_name,
              existingTask: existingTask.title,
              time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
              date: date,
              type: 'already_exists'
            });
            continue;
          }

          // Check for duplicate task name on the same date
          const duplicateTask = tasks.find(t => {
            if (t.start_date !== date) return false;
            return t.title.toLowerCase() === task.task_name.toLowerCase();
          });

          if (duplicateTask) {
            conflicts.push({
              templateTask: task.task_name,
              existingTask: duplicateTask.title,
              time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
              date: date,
              type: 'duplicate'
            });
            continue;
          }

          const overlappingTask = tasks.find(t => {
            if (t.start_date !== date) return false;
            if (!t.scheduled_start_time || !t.scheduled_end_time) return false;
            if (!task.start_time || !task.end_time) return false;
            return hasTimeOverlap(task.start_time, task.end_time, t);
          });

          if (overlappingTask) {
            conflicts.push({
              templateTask: task.task_name,
              existingTask: overlappingTask.title,
              time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
              date: date
            });
          }
        }
      } else if (recurrenceType === 'daily') {
        // Daily: Check for duplicate task name
        const duplicateTask = tasks.find(t => {
          if (t.recurrence_type !== 'daily') return false;
          return t.title.toLowerCase() === task.task_name.toLowerCase();
        });

        if (duplicateTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: duplicateTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'duplicate'
          });
          continue;
        }

        // Daily: Check for overlap with existing daily tasks
        const overlappingTask = tasks.find(t => {
          if (t.recurrence_type !== 'daily') return false;
          if (!t.scheduled_start_time || !t.scheduled_end_time) return false;
          if (!task.start_time || !task.end_time) return false;
          return hasTimeOverlap(task.start_time, task.end_time, t);
        });

        if (overlappingTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: overlappingTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'daily'
          });
        }
      } else if (recurrenceType === 'custom') {
        // Custom: Check for duplicate task name
        const duplicateTask = tasks.find(t => {
          if (t.recurrence_type !== 'custom') return false;
          return t.title.toLowerCase() === task.task_name.toLowerCase();
        });

        if (duplicateTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: duplicateTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'duplicate'
          });
          continue;
        }

        // Custom: Check for overlap with existing custom tasks on same days
        const overlappingTask = tasks.find(t => {
          if (t.recurrence_type !== 'custom') return false;
          if (!t.custom_days || !Array.isArray(t.custom_days)) return false;
          if (!t.scheduled_start_time || !t.scheduled_end_time) return false;
          if (!task.selected_days || !Array.isArray(task.selected_days)) return false;
          if (!task.start_time || !task.end_time) return false;

          const sharedDays = task.selected_days.filter(day => t.custom_days.includes(day));
          if (sharedDays.length === 0) return false;

          return hasTimeOverlap(task.start_time, task.end_time, t);
        });

        if (overlappingTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: overlappingTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'custom'
          });
        }
      }
    }

    // If there are conflicts, show error and don't create any tasks
    if (conflicts.length > 0) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Apply Template';
      
      let conflictMessage = 'Template application failed due to conflicts:\n\n';
      conflicts.forEach((conflict, index) => {
        if (conflict.type === 'already_exists') {
          conflictMessage += `${index + 1}. "${conflict.templateTask}" was already generated from this template on ${conflict.date}\n`;
        } else if (conflict.type === 'duplicate') {
          if (conflict.date) {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" already exists on ${conflict.date}\n`;
          } else {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" already exists as a recurring task\n`;
          }
        } else {
          if (conflict.date) {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" (${conflict.time} on ${conflict.date}) conflicts with "${conflict.existingTask}"\n`;
          } else {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" (${conflict.time}) conflicts with "${conflict.existingTask}"\n`;
          }
        }
      });
      conflictMessage += '\nPlease resolve these conflicts and try again.';
      alert(conflictMessage);
      return;
    }

    // No conflicts, proceed to create tasks
    saveBtn.textContent = 'Applying...';
    let tasksCreated = 0;

    // For each template task, create a task in the tasks table
    for (const task of templateTasksList) {
      // Tasks with recurrence_type "once" don't need selected_days
      if (task.recurrence_type !== 'once' && (!task.selected_days || !Array.isArray(task.selected_days))) {
        console.error('Task has invalid selected_days:', task);
        continue;
      }

      // Determine recurrence type and custom_days based on user selection
      let finalRecurrenceType = recurrenceType;
      let finalCustomDays = task.selected_days;

      if (recurrenceType === 'once') {
        // One-time: Only create tasks for matching dates in the selected range
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
          const dateStr = localDateString(currentDate);
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          if (task.selected_days && task.selected_days.includes(dayName)) {
            dates.push(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const date of dates) {
          const { data, error } = await window.supabase
            .from('tasks')
            .insert({
              user_id: currentUser.id,
              title: task.task_name,
              priority: task.priority || 'medium',
              recurrence_type: 'once',
              start_date: date,
              task_source: 'template',
              source_template_id: currentTemplate.id,
              source_template_task_id: task.id,
              template_icon_snapshot: currentTemplate.icon,
              scheduled_start_time: task.start_time,
              scheduled_end_time: task.end_time
            })
            .select()
            .single();

          if (error) {
            console.error('Failed to create task:', error);
            continue;
          }

          tasks.unshift(data);
          tasksCreated++;
        }
      } else if (recurrenceType === 'daily') {
        // Daily: Create one task that repeats daily
        const { data, error } = await window.supabase
          .from('tasks')
          .insert({
            user_id: currentUser.id,
            title: task.task_name,
            priority: task.priority || 'medium',
            recurrence_type: 'daily',
            start_date: startDate,
            due_date: repeatUntil,
            task_source: 'template',
            source_template_id: currentTemplate.id,
            source_template_task_id: task.id,
            template_icon_snapshot: currentTemplate.icon,
            scheduled_start_time: task.start_time,
            scheduled_end_time: task.end_time
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create task:', error);
          continue;
        }

        tasks.unshift(data);
        tasksCreated++;
      } else if (recurrenceType === 'custom') {
        // Custom: Create one task that repeats on the template's selected days
        const { data, error } = await window.supabase
          .from('tasks')
          .insert({
            user_id: currentUser.id,
            title: task.task_name,
            priority: task.priority || 'medium',
            recurrence_type: 'custom',
            custom_days: task.selected_days || [],
            start_date: startDate,
            due_date: repeatUntil,
            task_source: 'template',
            source_template_id: currentTemplate.id,
            source_template_task_id: task.id,
            template_icon_snapshot: currentTemplate.icon,
            scheduled_start_time: task.start_time,
            scheduled_end_time: task.end_time
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create task:', error);
          continue;
        }

        tasks.unshift(data);
        tasksCreated++;
      }
    }

    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
    closeApplyTemplateModal();

    alert(`Template applied! ${tasksCreated} tasks created successfully.`);
  } catch (error) {
    alert('Failed to apply template: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Apply Template';
  }
}

// Initialize app
function initializeApp() {
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Initialize date filter to today
  const dateFilter = document.getElementById('taskDateFilter');
  if (dateFilter) {
    dateFilter.value = localDateString();
  }

  renderTasks();
  updateStats();
  renderCalendar();
  renderProfile();

  document.getElementById('modalTaskName').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTaskFromModal();
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('show');
        // If it's the reset password modal, clear URL params
        if (modal.id === 'resetPasswordModal') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });
  });

  // Handle period filter change for analytics (single listener)
  const periodSelect = document.getElementById('analyticsPeriod');
  if (periodSelect) {
    periodSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        document.getElementById('customDateRange').style.display = 'flex';
      } else {
        document.getElementById('customDateRange').style.display = 'none';
        updateAnalytics();
      }
    });
  }

  // Add event listeners for apply template modal dates
  const applyStartDate = document.getElementById('applyStartDate');
  const applyEndDate = document.getElementById('applyEndDate');
  if (applyStartDate) applyStartDate.addEventListener('change', generateApplyPreview);
  if (applyEndDate) applyEndDate.addEventListener('change', generateApplyPreview);
}

// Goals Functions
function openGoalsModal() {
  editingGoalId = null;
  document.getElementById('goalName').value = '';
  document.getElementById('goalDeadline').value = '';
  document.getElementById('goalDescription').value = '';
  document.getElementById('goalError').hidden = true;
  hideGoalForm();
  renderGoals();
  document.getElementById('goalsModal').classList.add('show');
}

function closeGoalsModal() {
  document.getElementById('goalsModal').classList.remove('show');
}

function showGoalForm() {
  document.getElementById('goalFormContainer').hidden = false;
  document.getElementById('addGoalBtn').hidden = true;
  document.getElementById('cancelGoalBtn').hidden = false;
  document.getElementById('saveGoalBtn').hidden = false;
  document.getElementById('goalName').focus();
}

function hideGoalForm() {
  document.getElementById('goalFormContainer').hidden = true;
  document.getElementById('addGoalBtn').hidden = false;
  document.getElementById('cancelGoalBtn').hidden = true;
  document.getElementById('saveGoalBtn').hidden = true;
  document.getElementById('goalName').value = '';
  document.getElementById('goalDeadline').value = '';
  document.getElementById('goalDescription').value = '';
  editingGoalId = null;
}

function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!goals.length) {
    container.innerHTML = '<li class="empty">No long-term goals yet. Add your first goal!</li>';
    return;
  }

  const today = localDateString();
  container.innerHTML = goals.map(goal => {
    const isOverdue = goal.deadline < today && !goal.completed;
    const isUrgent = !isOverdue && goal.deadline <= localDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) && !goal.completed;
    const statusClass = isOverdue ? 'goal-overdue' : (isUrgent ? 'goal-urgent' : (goal.completed ? 'goal-completed' : ''));

    const celebrationHtml = goal.completed ? '<span class="goal-celebration">❤️‍🔥</span>' : '';
    const goalName = goal.name || 'Unnamed Goal';

    // Calculate days left
    const daysLeft = Math.ceil((new Date(goal.deadline) - new Date(today)) / (1000 * 60 * 60 * 24));
    let daysLeftHtml = '';
    if (goal.completed) {
      daysLeftHtml = '<span class="goal-days-left completed">Completed ✓</span>';
    } else if (isOverdue) {
      daysLeftHtml = `<span class="goal-days-left overdue">${Math.abs(daysLeft)} days overdue</span>`;
    } else if (daysLeft === 0) {
      daysLeftHtml = '<span class="goal-days-left urgent">Due today!</span>';
    } else if (daysLeft === 1) {
      daysLeftHtml = '<span class="goal-days-left urgent">1 day left</span>';
    } else {
      daysLeftHtml = `<span class="goal-days-left">${daysLeft} days left</span>`;
    }

    return `
      <li class="${statusClass}" data-goal-id="${goal.id}">
        <div class="goal-info">
          <div class="goal-name">${escapeHtml(goalName)}${celebrationHtml}</div>
          <div class="goal-deadline">Deadline: ${new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          ${daysLeftHtml}
          ${goal.description ? `<div class="goal-description">${escapeHtml(goal.description)}</div>` : ''}
        </div>
        <div class="goal-actions">
          <button class="complete-btn" onclick="toggleGoal('${goal.id}')">${goal.completed ? 'Undo' : 'Complete'}</button>
          <button class="delete-btn" onclick="deleteGoal('${goal.id}')">Delete</button>
        </div>
      </li>
    `;
  }).join('');
}

async function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const deadline = document.getElementById('goalDeadline').value;
  const description = document.getElementById('goalDescription').value.trim();

  if (!name) return alert('Please enter a goal name.');
  if (!deadline) return alert('Please select a deadline.');

  const saveBtn = document.querySelector('#goalsModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingGoalId) {
      const { data, error } = await window.supabase
        .from('goals')
        .update({
          name,
          deadline,
          description
        })
        .eq('id', editingGoalId)
        .select()
        .single();

      if (error) throw error;

      const index = goals.findIndex(g => g.id === editingGoalId);
      if (index !== -1) goals[index] = data;
    } else {
      const { data, error } = await window.supabase
        .from('goals')
        .insert({
          user_id: currentUser.id,
          name,
          deadline,
          description,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      goals.push(data);
    }

    renderGoals();
    updateStats();
    renderCalendar();
    document.getElementById('goalName').value = '';
    document.getElementById('goalDeadline').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('goalName').focus();
  } catch (error) {
    alert('Failed to save goal: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Add Goal';
  }
}

async function toggleGoal(goalId) {
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;

  try {
    const { data, error } = await window.supabase
      .from('goals')
      .update({ completed: !goal.completed })
      .eq('id', goalId)
      .eq('user_id', currentUser.id)
      .select()
      .single();

    if (error) throw error;

    // Update local state
    goal.completed = data.completed;

    // Reload goals from database to ensure we have the correct state
    const { data: goalsData } = await window.supabase
      .from('goals')
      .select('id,user_id,name,description,deadline,completed,created_at,updated_at')
      .eq('user_id', currentUser.id)
      .order('deadline', { ascending: true });

    goals = goalsData || [];

    renderGoals();
    updateStats();
    renderCalendar();
  } catch (error) {
    console.error('Failed to update goal:', error);
    alert('Failed to update goal: ' + error.message);
  }
}

function showConfettiCelebration(goalId) {
  const goalElement = document.querySelector(`[data-goal-id="${goalId}"]`);
  if (!goalElement) {
    console.error('Goal element not found for ID:', goalId);
    return;
  }

  const goalNameElement = goalElement.querySelector('.goal-name');
  if (!goalNameElement) {
    console.error('Goal name element not found');
    return;
  }

  // Remove existing celebration if any
  const existingCelebration = goalNameElement.querySelector('.goal-celebration');
  if (existingCelebration) {
    existingCelebration.remove();
  }

  // Add celebration emoji
  const celebration = document.createElement('span');
  celebration.className = 'goal-celebration';
  celebration.textContent = '❤️‍🔥';
  goalNameElement.appendChild(celebration);
}

async function deleteGoal(goalId) {
  if (!confirm('Delete this goal?')) return;

  try {
    const { error } = await window.supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;

    goals = goals.filter(g => g.id !== goalId);
    renderGoals();
    updateStats();
    renderCalendar();
  } catch (error) {
    alert('Failed to delete goal: ' + error.message);
  }
}

// Motivation Settings Functions
async function saveMotivationSettings() {
  const emoji = document.getElementById('userEmoji').value.trim();
  const message = document.getElementById('userMessage').value.trim();

  if (emoji && message) {
    userEmoji = emoji;
    userMessage = message;
    localStorage.setItem('userEmoji', emoji);
    localStorage.setItem('userMessage', message);

    // Save to database for permanent storage
    try {
      const { error } = await window.supabase
        .from('profiles')
        .update({
          motivation_emoji: emoji,
          motivation_message: message
        })
        .eq('id', currentUser.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save motivation settings to database:', error);
    }

    // Update header emoji
    const headerEmoji = document.getElementById('headerEmoji');
    headerEmoji.textContent = emoji;
    headerEmoji.style.display = 'inline-block';

    alert('Motivation settings saved!');
  } else {
    alert('Please enter both emoji and message');
  }
}

function showMotivationPopup() {
  if (!userEmoji || !userMessage) {
    alert('Please set your emoji and message in Settings first');
    return;
  }

  const popup = document.getElementById('motivationPopup');
  const popupMessage = document.getElementById('popupMessage');
  const headerEmoji = document.getElementById('headerEmoji');

  popupMessage.textContent = userMessage;

  // Add pop animation to header emoji
  headerEmoji.classList.add('pop');
  setTimeout(() => headerEmoji.classList.remove('pop'), 500);

  // Show popup
  popup.style.display = 'block';

  // Hide popup after 3 seconds
  setTimeout(() => {
    popup.style.display = 'none';
  }, 3000);
}

async function loadMotivationSettings() {
  const headerEmoji = document.getElementById('headerEmoji');
  const userEmojiInput = document.getElementById('userEmoji');
  const userMessageInput = document.getElementById('userMessage');

  // Try to load from database first
  try {
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('motivation_emoji, motivation_message')
      .eq('id', currentUser.id)
      .single();

    if (profile) {
      const dbEmoji = profile.motivation_emoji;
      const dbMessage = profile.motivation_message;

      if (dbEmoji && dbMessage) {
        userEmoji = dbEmoji;
        userMessage = dbMessage;
        localStorage.setItem('userEmoji', dbEmoji);
        localStorage.setItem('userMessage', dbMessage);
      }
    }
  } catch (error) {
    console.error('Failed to load motivation settings from database:', error);
  }

  // Fallback to localStorage if database doesn't have values
  if (!userEmoji || !userMessage) {
    userEmoji = localStorage.getItem('userEmoji') || '';
    userMessage = localStorage.getItem('userMessage') || '';
  }

  if (userEmoji && userMessage) {
    headerEmoji.textContent = userEmoji;
    headerEmoji.style.display = 'inline-block';
    userEmojiInput.value = userEmoji;
    userMessageInput.value = userMessage;
  }
}

// Time Picker Functions
function openTimePicker(target) {
  timePickerTarget = target;
  timePickerMode = 'hour';

  // Get current value from the input
  const inputId = target === 'start' ? 'templateTaskStartTime' : 'templateTaskEndTime';
  const currentValue = document.getElementById(inputId).value;

  if (currentValue) {
    const [hours, minutes] = currentValue.split(':');
    selectedHour = parseInt(hours);
    selectedMinute = parseInt(minutes);
    isPM = selectedHour >= 12;
    if (selectedHour > 12) selectedHour -= 12;
    if (selectedHour === 0) selectedHour = 12;
  } else {
    selectedHour = 9;
    selectedMinute = 0;
    isPM = false;
  }

  renderClockFace();
  updateTimeDisplay();
  document.getElementById('timePickerModal').classList.add('show');
}

function closeTimePicker() {
  document.getElementById('timePickerModal').classList.remove('show');
}

function renderClockFace() {
  const clockFace = document.getElementById('clockFace');
  const radius = 42; // percentage

  let html = '';

  if (timePickerMode === 'hour') {
    // Render hours (1-12)
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      const isSelected = i === selectedHour;
      html += `<div class="clock-number ${isSelected ? 'selected' : ''}" style="left:${x}%;top:${y}%" onclick="selectHour(${i})">${i}</div>`;
    }
  } else {
    // Render minutes (0, 5, 10, ..., 55)
    for (let i = 0; i < 12; i++) {
      const minute = i * 5;
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      const isSelected = minute === selectedMinute;
      html += `<div class="clock-number ${isSelected ? 'selected' : ''}" style="left:${x}%;top:${y}%" onclick="selectMinute(${minute})">${minute === 0 ? '00' : minute}</div>`;
    }
  }

  // Add clock hand
  const handAngle = timePickerMode === 'hour'
    ? (selectedHour * 30 - 90)
    : (selectedMinute * 6 - 90);
  html += `<div class="clock-hand" style="transform:rotate(${handAngle}deg)"></div>`;
  html += `<div class="clock-center"></div>`;

  clockFace.innerHTML = html;
}

function selectHour(hour) {
  selectedHour = hour;
  renderClockFace();
  updateTimeDisplay();
}

function selectMinute(minute) {
  selectedMinute = minute;
  renderClockFace();
  updateTimeDisplay();
}

function togglePeriod() {
  isPM = !isPM;
  updateTimeDisplay();
}

function setTimePickerMode(mode) {
  timePickerMode = mode;
  renderClockFace();
}

function updateTimeDisplay() {
  document.getElementById('selectedHour').textContent = String(selectedHour).padStart(2, '0');
  document.getElementById('selectedMinute').textContent = String(selectedMinute).padStart(2, '0');
  document.getElementById('selectedPeriod').textContent = isPM ? 'PM' : 'AM';
}

function confirmTimeSelection() {
  let hour24 = selectedHour;
  if (isPM && selectedHour !== 12) hour24 += 12;
  if (!isPM && selectedHour === 12) hour24 = 0;

  const timeString = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  const inputId = timePickerTarget === 'start' ? 'templateTaskStartTime' : 'templateTaskEndTime';
  document.getElementById(inputId).value = timeString;

  closeTimePicker();
}

// Auth state listener
if (window.supabase && window.supabase.auth) {
  window.supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      await loadUserData();
      if (!document.getElementById('authScreen').hidden) {
        enterApp();
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      userProfile = null;
      tasks = [];
      taskCompletions = [];
    }
  });
} else {
  console.error('Supabase auth not available!');
}

// On DOM load
// Notes tab switching
function switchNotesTab(tab) {
  const notesTabBtn = document.getElementById('notesTabBtn');
  const moneyTabBtn = document.getElementById('moneyTabBtn');
  const notesTabContent = document.getElementById('notesTabContent');
  const moneyTabContent = document.getElementById('moneyTabContent');
  
  if (!notesTabBtn || !moneyTabBtn || !notesTabContent || !moneyTabContent) return;
  
  if (tab === 'notes') {
    notesTabBtn.classList.add('active');
    moneyTabBtn.classList.remove('active');
    notesTabContent.style.display = 'block';
    moneyTabContent.style.display = 'none';
  } else {
    moneyTabBtn.classList.add('active');
    notesTabBtn.classList.remove('active');
    moneyTabContent.style.display = 'block';
    notesTabContent.style.display = 'none';
    loadMoneyForDate();
  }
}

// Money tab functions
function loadMoneyForDate() {
  const dateInput = document.getElementById('moneyDateSelect');
  if (dateInput && !dateInput.value) {
    dateInput.value = localDateString();
  }
  
  const date = dateInput ? dateInput.value : localDateString();
  
  // Calculate and display money overview
  updateMoneyOverview(date);
  
  // Load transactions for the selected date
  filterTransactions();
}

function updateMoneyOverview(date) {
  const totalBalanceEl = document.getElementById('totalBalance');
  const todayIncomeEl = document.getElementById('todayIncome');
  const todayExpensesEl = document.getElementById('todayExpenses');
  const todayNetSavingsEl = document.getElementById('todayNetSavings');
  const totalLentEl = document.getElementById('totalLentMoney');
  
  if (!totalBalanceEl || !todayIncomeEl || !todayExpensesEl || !todayNetSavingsEl || !totalLentEl) return;
  
  // Calculate total balance (sum of all account balances)
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);
  
  // Calculate today's income and expenses
  const todayTransactions = transactions.filter(t => t.date === date);
  const todayIncome = todayTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const todayExpenses = todayTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const todayNetSavings = todayIncome - todayExpenses;
  
  // Calculate total pending lent money
  const totalLent = lentMoney
    .filter(l => l.status === 'pending')
    .reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
  
  // Update UI
  totalBalanceEl.textContent = `₹${totalBalance.toFixed(2)}`;
  todayIncomeEl.textContent = `₹${todayIncome.toFixed(2)}`;
  todayExpensesEl.textContent = `₹${todayExpenses.toFixed(2)}`;
  todayNetSavingsEl.textContent = `₹${todayNetSavings.toFixed(2)}`;
  totalLentEl.textContent = `₹${totalLent.toFixed(2)}`;
  
  // Set date for income/expense/transfer modals
  const today = localDateString();
  const incomeDateEl = document.getElementById('incomeDate');
  const expenseDateEl = document.getElementById('expenseDate');
  const transferDateEl = document.getElementById('transferDate');
  
  if (incomeDateEl) incomeDateEl.value = today;
  if (expenseDateEl) expenseDateEl.value = today;
  if (transferDateEl) transferDateEl.value = today;
}

// Account management
function openAccountsModal() {
  const modal = document.getElementById('accountsModal');
  if (modal) {
    modal.classList.add('show');
    renderAccountsList();
    const errorEl = document.getElementById('accountError');
    if (errorEl) errorEl.hidden = true;
  }
}

function closeAccountsModal() {
  const modal = document.getElementById('accountsModal');
  if (modal) {
    modal.classList.remove('show');
    const nameEl = document.getElementById('accountName');
    const typeEl = document.getElementById('accountType');
    const balanceEl = document.getElementById('accountOpeningBalance');
    if (nameEl) nameEl.value = '';
    if (typeEl) typeEl.value = '';
    if (balanceEl) balanceEl.value = '';
  }
}

async function saveAccount() {
  const nameEl = document.getElementById('accountName');
  const typeEl = document.getElementById('accountType');
  const balanceEl = document.getElementById('accountOpeningBalance');
  const errorEl = document.getElementById('accountError');
  
  if (!nameEl || !typeEl || !balanceEl || !errorEl) return;
  
  const name = nameEl.value.trim();
  const type = typeEl.value;
  const openingBalance = parseFloat(balanceEl.value) || 0;
  
  if (!name || !type) {
    errorEl.textContent = 'Please fill in all required fields.';
    errorEl.hidden = false;
    return;
  }
  
  try {
    const { data, error } = await supabase.from('accounts').insert({
      user_id: currentUser.id,
      name,
      type,
      opening_balance: openingBalance,
      current_balance: openingBalance
    }).select().single();
    
    if (error) {
      if (error.code === '42P01') {
        errorEl.textContent = 'Database migration not run. Please run migration_expense_tracker.sql in Supabase.';
      } else {
        throw error;
      }
    }
    
    if (data) {
      accounts.push(data);
      renderAccountsList();
      
      // Clear form
      nameEl.value = '';
      typeEl.value = '';
      balanceEl.value = '';
      
      // Update money overview
      loadMoneyForDate();
    }
    
  } catch (error) {
    console.error('Error saving account:', error);
    errorEl.textContent = 'Failed to save account. Please try again.';
    errorEl.hidden = false;
  }
}

function renderAccountsList() {
  const accountsList = document.getElementById('accountsList');
  if (!accountsList) return;
  
  if (accounts.length === 0) {
    accountsList.innerHTML = '<p style="color:#666; font-size:13px;">No accounts yet. Add your first account above.</p>';
    return;
  }
  
  accountsList.innerHTML = accounts.map(acc => `
    <div class="account-item">
      <div class="account-info">
        <div class="account-name">${acc.name}</div>
        <div class="account-type">${acc.type}</div>
      </div>
      <div class="account-balance">₹${parseFloat(acc.current_balance || 0).toFixed(2)}</div>
      <div class="account-actions">
        <button class="delete-btn" onclick="deleteAccount('${acc.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function deleteAccount(accountId) {
  if (!confirm('Are you sure you want to delete this account? This will also delete all transactions associated with this account.')) {
    return;
  }
  
  try {
    // Delete associated transactions first
    await supabase.from('transactions').delete().eq('account_id', accountId);
    
    // Delete the account
    const { error } = await supabase.from('accounts').delete().eq('id', accountId);
    
    if (error) throw error;
    
    // Update local data
    accounts = accounts.filter(acc => acc.id !== accountId);
    transactions = transactions.filter(t => t.account_id !== accountId);
    
    renderAccountsList();
    loadMoneyForDate();
    
  } catch (error) {
    console.error('Error deleting account:', error);
    alert('Failed to delete account. Please try again.');
  }
}

// Income functions
function openAddIncomeModal() {
  const modal = document.getElementById('addIncomeModal');
  if (modal) {
    modal.classList.add('show');
    populateAccountSelect('incomeAccount');
    const errorEl = document.getElementById('incomeError');
    if (errorEl) errorEl.hidden = true;
    
    // Set date to currently selected date
    const dateInput = document.getElementById('moneyDateSelect');
    const incomeDateEl = document.getElementById('incomeDate');
    if (dateInput && dateInput.value && incomeDateEl) {
      incomeDateEl.value = dateInput.value;
    }
  }
}

function closeAddIncomeModal() {
  const modal = document.getElementById('addIncomeModal');
  if (modal) {
    modal.classList.remove('show');
    const amountEl = document.getElementById('incomeAmount');
    const categoryEl = document.getElementById('incomeCategory');
    const accountEl = document.getElementById('incomeAccount');
    const descEl = document.getElementById('incomeDescription');
    if (amountEl) amountEl.value = '';
    if (categoryEl) categoryEl.value = '';
    if (accountEl) accountEl.value = '';
    if (descEl) descEl.value = '';
  }
}

async function saveIncome() {
  const amountEl = document.getElementById('incomeAmount');
  const categoryEl = document.getElementById('incomeCategory');
  const accountEl = document.getElementById('incomeAccount');
  const dateEl = document.getElementById('incomeDate');
  const descEl = document.getElementById('incomeDescription');
  const errorEl = document.getElementById('incomeError');
  
  if (!amountEl || !categoryEl || !accountEl || !dateEl || !errorEl) return;
  
  const amount = parseFloat(amountEl.value);
  const category = categoryEl.value;
  const accountId = accountEl.value;
  const date = dateEl.value;
  const description = descEl ? descEl.value.trim() : '';
  
  if (!amount || !category || !accountId || !date) {
    errorEl.textContent = 'Please fill in all required fields.';
    errorEl.hidden = false;
    return;
  }
  
  try {
    // Add transaction
    const { data, error } = await supabase.from('transactions').insert({
      user_id: currentUser.id,
      transaction_type: 'income',
      amount,
      category,
      account_id: accountId,
      date,
      description
    }).select().single();
    
    if (error) {
      if (error.code === '42P01') {
        errorEl.textContent = 'Database migration not run. Please run migration_expense_tracker.sql in Supabase.';
      } else {
        throw error;
      }
    }
    
    if (data) {
      transactions.unshift(data);
      
      // Update account balance
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        const newBalance = parseFloat(account.current_balance || 0) + amount;
        await supabase.from('accounts').update({ current_balance: newBalance }).eq('id', accountId);
        account.current_balance = newBalance;
      }
      
      closeAddIncomeModal();
      loadMoneyForDate();
    }
    
  } catch (error) {
    console.error('Error saving income:', error);
    errorEl.textContent = 'Failed to save income. Please try again.';
    errorEl.hidden = false;
  }
}

// Expense functions
function loadCustomCategories() {
  const categoryEl = document.getElementById('expenseCategory');
  const categoryFilterEl = document.getElementById('categoryFilter');
  if (!categoryEl) return;
  
  const customCategories = JSON.parse(localStorage.getItem('customExpenseCategories') || '[]');
  
  // Remove existing custom categories (except the "add_custom" option)
  const options = Array.from(categoryEl.options);
  options.forEach(option => {
    if (option.value === 'add_custom') return;
    const isDefault = ['Milk', 'Peanut Butter', 'Eggs', 'Biryani', 'Online Shopping', 'Recharge', 'Study', 'Fee', 'Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Medicine', 'Personal', 'Other'].includes(option.value);
    if (!isDefault) {
      categoryEl.removeChild(option);
    }
  });
  
  // Add custom categories before the "add_custom" option
  const addCustomOption = categoryEl.querySelector('option[value="add_custom"]');
  customCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryEl.insertBefore(option, addCustomOption);
  });
  
  // Update category filter dropdown
  if (categoryFilterEl) {
    const filterOptions = Array.from(categoryFilterEl.options);
    filterOptions.forEach(option => {
      if (option.value === '') return;
      const isDefault = ['Milk', 'Peanut Butter', 'Eggs', 'Biryani', 'Online Shopping', 'Recharge', 'Study', 'Fee', 'Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Medicine', 'Personal', 'Other'].includes(option.value);
      if (!isDefault) {
        categoryFilterEl.removeChild(option);
      }
    });
    
    customCategories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilterEl.appendChild(option);
    });
  }
}

function handleCategoryChange() {
  const categoryEl = document.getElementById('expenseCategory');
  const customContainer = document.getElementById('customCategoryContainer');
  const customInput = document.getElementById('customCategory');
  
  if (!categoryEl || !customContainer || !customInput) return;
  
  if (categoryEl.value === 'add_custom') {
    customContainer.style.display = 'block';
    customInput.focus();
  } else {
    customContainer.style.display = 'none';
    customInput.value = '';
  }
}

function openAddExpenseModal() {
  const modal = document.getElementById('addExpenseModal');
  if (modal) {
    modal.classList.add('show');
    populateAccountSelect('expenseAccount');
    loadCustomCategories();
    const errorEl = document.getElementById('expenseError');
    if (errorEl) errorEl.hidden = true;
    
    // Set date to currently selected date
    const dateInput = document.getElementById('moneyDateSelect');
    const expenseDateEl = document.getElementById('expenseDate');
    if (dateInput && dateInput.value && expenseDateEl) {
      expenseDateEl.value = dateInput.value;
    }
  }
}

function closeAddExpenseModal() {
  const modal = document.getElementById('addExpenseModal');
  if (modal) {
    modal.classList.remove('show');
    const amountEl = document.getElementById('expenseAmount');
    const categoryEl = document.getElementById('expenseCategory');
    const customCategoryEl = document.getElementById('customCategory');
    const customContainer = document.getElementById('customCategoryContainer');
    const accountEl = document.getElementById('expenseAccount');
    const descEl = document.getElementById('expenseDescription');
    if (amountEl) amountEl.value = '';
    if (categoryEl) categoryEl.value = '';
    if (customCategoryEl) customCategoryEl.value = '';
    if (customContainer) customContainer.style.display = 'none';
    if (accountEl) accountEl.value = '';
    if (descEl) descEl.value = '';
  }
}

async function saveExpense() {
  const amountEl = document.getElementById('expenseAmount');
  const categoryEl = document.getElementById('expenseCategory');
  const customCategoryEl = document.getElementById('customCategory');
  const accountEl = document.getElementById('expenseAccount');
  const dateEl = document.getElementById('expenseDate');
  const descEl = document.getElementById('expenseDescription');
  const errorEl = document.getElementById('expenseError');
  
  if (!amountEl || !categoryEl || !accountEl || !dateEl || !errorEl) return;
  
  const amount = parseFloat(amountEl.value);
  let category = categoryEl.value;
  const accountId = accountEl.value;
  const date = dateEl.value;
  const description = descEl ? descEl.value.trim() : '';
  
  // Handle custom category
  if (category === 'add_custom') {
    if (!customCategoryEl || !customCategoryEl.value.trim()) {
      errorEl.textContent = 'Please enter a custom category name.';
      errorEl.hidden = false;
      return;
    }
    category = customCategoryEl.value.trim();
    
    // Save custom category to localStorage
    const customCategories = JSON.parse(localStorage.getItem('customExpenseCategories') || '[]');
    if (!customCategories.includes(category)) {
      customCategories.push(category);
      localStorage.setItem('customExpenseCategories', JSON.stringify(customCategories));
      loadCustomCategories();
    }
  }
  
  if (!amount || !category || !accountId || !date) {
    errorEl.textContent = 'Please fill in all required fields.';
    errorEl.hidden = false;
    return;
  }
  
  try {
    // Add transaction
    const { data, error } = await supabase.from('transactions').insert({
      user_id: currentUser.id,
      transaction_type: 'expense',
      amount,
      category,
      account_id: accountId,
      date,
      description
    }).select().single();
    
    if (error) {
      if (error.code === '42P01') {
        errorEl.textContent = 'Database migration not run. Please run migration_expense_tracker.sql in Supabase.';
      } else {
        throw error;
      }
    }
    
    if (data) {
      transactions.unshift(data);
      
      // Update account balance
      const account = accounts.find(acc => acc.id === accountId);
      if (account) {
        const newBalance = parseFloat(account.current_balance || 0) - amount;
        await supabase.from('accounts').update({ current_balance: newBalance }).eq('id', accountId);
        account.current_balance = newBalance;
      }
      
      closeAddExpenseModal();
      loadMoneyForDate();
    }
    
  } catch (error) {
    console.error('Error saving expense:', error);
    errorEl.textContent = 'Failed to save expense. Please try again.';
    errorEl.hidden = false;
  }
}

// Transfer functions
function openTransferModal() {
  const modal = document.getElementById('transferModal');
  if (modal) {
    modal.classList.add('show');
    populateAccountSelect('transferFromAccount');
    populateAccountSelect('transferToAccount');
    const errorEl = document.getElementById('transferError');
    if (errorEl) errorEl.hidden = true;
    
    // Set date to currently selected date
    const dateInput = document.getElementById('moneyDateSelect');
    const transferDateEl = document.getElementById('transferDate');
    if (dateInput && dateInput.value && transferDateEl) {
      transferDateEl.value = dateInput.value;
    }
  }
}

function closeTransferModal() {
  const modal = document.getElementById('transferModal');
  if (modal) {
    modal.classList.remove('show');
    const amountEl = document.getElementById('transferAmount');
    const fromEl = document.getElementById('transferFromAccount');
    const toEl = document.getElementById('transferToAccount');
    const descEl = document.getElementById('transferDescription');
    if (amountEl) amountEl.value = '';
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    if (descEl) descEl.value = '';
  }
}

async function saveTransfer() {
  const amountEl = document.getElementById('transferAmount');
  const fromEl = document.getElementById('transferFromAccount');
  const toEl = document.getElementById('transferToAccount');
  const dateEl = document.getElementById('transferDate');
  const descEl = document.getElementById('transferDescription');
  const errorEl = document.getElementById('transferError');
  
  if (!amountEl || !fromEl || !toEl || !dateEl || !errorEl) return;
  
  const amount = parseFloat(amountEl.value);
  const fromAccountId = fromEl.value;
  const toAccountId = toEl.value;
  const date = dateEl.value;
  const description = descEl ? descEl.value.trim() : '';
  
  if (!amount || !fromAccountId || !toAccountId || !date) {
    errorEl.textContent = 'Please fill in all required fields.';
    errorEl.hidden = false;
    return;
  }
  
  if (fromAccountId === toAccountId) {
    errorEl.textContent = 'Cannot transfer to the same account.';
    errorEl.hidden = false;
    return;
  }
  
  try {
    // Check if from account has sufficient balance
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    if (!fromAccount || parseFloat(fromAccount.current_balance || 0) < amount) {
      errorEl.textContent = 'Insufficient balance in source account.';
      errorEl.hidden = false;
      return;
    }
    
    // Add transfer transaction
    const toAccount = accounts.find(acc => acc.id === toAccountId);
    const toAccountName = toAccount ? toAccount.name : 'account';
    
    const { data, error } = await supabase.from('transactions').insert({
      user_id: currentUser.id,
      transaction_type: 'transfer',
      amount,
      category: 'Transfer',
      account_id: fromAccountId,
      transfer_to_account_id: toAccountId,
      date,
      description: description || `Transfer to ${toAccountName}`
    }).select().single();
    
    if (error) {
      if (error.code === '42P01') {
        errorEl.textContent = 'Database migration not run. Please run migration_expense_tracker.sql in Supabase.';
      } else {
        throw error;
      }
    }
    
    if (data) {
      transactions.unshift(data);
      
      // Update both account balances
      const newFromBalance = parseFloat(fromAccount.current_balance || 0) - amount;
      const newToBalance = toAccount ? parseFloat(toAccount.current_balance || 0) + amount : 0;
      
      await supabase.from('accounts').update({ current_balance: newFromBalance }).eq('id', fromAccountId);
      await supabase.from('accounts').update({ current_balance: newToBalance }).eq('id', toAccountId);
      
      fromAccount.current_balance = newFromBalance;
      if (toAccount) toAccount.current_balance = newToBalance;
      
      closeTransferModal();
      loadMoneyForDate();
    }
    
  } catch (error) {
    console.error('Error saving transfer:', error);
    errorEl.textContent = 'Failed to save transfer. Please try again.';
    errorEl.hidden = false;
  }
}

// Transaction history
function filterTransactions() {
  const filterEl = document.getElementById('transactionFilter');
  const categoryFilterEl = document.getElementById('categoryFilter');
  const dateInput = document.getElementById('moneyDateSelect');
  
  if (!filterEl) return;
  
  const filter = filterEl.value;
  const selectedDate = dateInput ? dateInput.value : localDateString();
  
  // Show/hide category filter
  if (categoryFilterEl) {
    categoryFilterEl.style.display = filter === 'category-by-category' ? 'inline-block' : 'none';
  }
  
  let filteredTransactions = transactions || [];
  
  // Filter by date (show all for now, could be changed to show only selected date)
  // filteredTransactions = filteredTransactions.filter(t => t.date === selectedDate);
  
  // Filter by type
  if (filter === 'income') {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_type === 'income');
  } else if (filter === 'expense') {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_type === 'expense');
  } else if (filter === 'transfer') {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_type === 'transfer');
  }
  
  // Filter by category
  if (filter === 'category-by-category' && categoryFilterEl) {
    const selectedCategory = categoryFilterEl.value;
    if (selectedCategory) {
      filteredTransactions = filteredTransactions.filter(t => t.category === selectedCategory);
    }
  }
  
  renderTransactionsList(filteredTransactions);
}

function renderTransactionsList(transactionsList) {
  const transactionsListEl = document.getElementById('transactionsList');
  if (!transactionsListEl) return;
  
  if (!transactionsList || transactionsList.length === 0) {
    transactionsListEl.innerHTML = '<p style="color:#666; font-size:13px; text-align:center; padding:20px;">No transactions found.</p>';
    return;
  }
  
  transactionsListEl.innerHTML = transactionsList.map(t => {
    const account = accounts.find(acc => acc.id === t.account_id);
    const accountName = account ? account.name : 'Unknown Account';
    const amountClass = t.transaction_type === 'income' ? 'income' : (t.transaction_type === 'expense' ? 'expense' : 'transfer');
    const amountPrefix = t.transaction_type === 'income' ? '+' : (t.transaction_type === 'expense' ? '-' : '');
    
    // Display description if available, otherwise show category
    const displayName = t.description ? t.description : t.category;
    const descriptionMeta = t.description ? `• ${t.category}` : '';
    
    return `
      <div class="transaction-item ${t.transaction_type}">
        <div class="transaction-info">
          <div class="transaction-name">${displayName}</div>
          <div class="transaction-meta">${t.date} ${descriptionMeta} • ${accountName}</div>
        </div>
        <div class="transaction-amount ${amountClass}">${amountPrefix}₹${parseFloat(t.amount || 0).toFixed(2)}</div>
        <div class="transaction-actions">
          <button class="delete-btn" onclick="deleteTransaction('${t.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteTransaction(transactionId) {
  if (!confirm('Are you sure you want to delete this transaction? This will update the account balance.')) {
    return;
  }
  
  try {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    // Reverse the balance change
    const account = accounts.find(acc => acc.id === transaction.account_id);
    if (account) {
      let newBalance;
      if (transaction.transaction_type === 'income') {
        newBalance = parseFloat(account.current_balance || 0) - parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'expense') {
        newBalance = parseFloat(account.current_balance || 0) + parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'transfer') {
        // For transfers, we need to reverse both accounts
        const toAccount = accounts.find(acc => acc.id === transaction.transfer_to_account_id);
        if (toAccount) {
          await supabase.from('accounts').update({ 
            current_balance: parseFloat(toAccount.current_balance || 0) - parseFloat(transaction.amount || 0) 
          }).eq('id', transaction.transfer_to_account_id);
          toAccount.current_balance = parseFloat(toAccount.current_balance || 0) - parseFloat(transaction.amount || 0);
        }
        newBalance = parseFloat(account.current_balance || 0) + parseFloat(transaction.amount || 0);
      }
      
      await supabase.from('accounts').update({ current_balance: newBalance }).eq('id', transaction.account_id);
      account.current_balance = newBalance;
    }
    
    // Delete the transaction
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    
    if (error) throw error;
    
    // Update local data
    transactions = transactions.filter(t => t.id !== transactionId);
    
    filterTransactions();
    loadMoneyForDate();
    
  } catch (error) {
    console.error('Error deleting transaction:', error);
    alert('Failed to delete transaction. Please try again.');
  }
}

// Helper function to populate account select dropdowns
function populateAccountSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select account</option>' + 
    accounts.map(acc => `<option value="${acc.id}">${acc.name} (₹${parseFloat(acc.current_balance || 0).toFixed(2)})</option>`).join('');
}

// Pending Money Functions
function openLentMoneyModal() {
  const modal = document.getElementById('lendMoneyModal');
  if (modal) {
    modal.classList.add('show');
    renderLentMoneyList();
    renderOwedMoneyList();
    const errorEl = document.getElementById('lendError');
    const owedErrorEl = document.getElementById('owedError');
    if (errorEl) errorEl.hidden = true;
    if (owedErrorEl) owedErrorEl.hidden = true;
  }
}

function closeLentMoneyModal() {
  const modal = document.getElementById('lendMoneyModal');
  if (modal) {
    modal.classList.remove('show');
    // Clear receive form
    const nameEl = document.getElementById('lentPersonName');
    const amountEl = document.getElementById('lentAmount');
    const dateEl = document.getElementById('lentDate');
    const dueDateEl = document.getElementById('lentDueDate');
    const descEl = document.getElementById('lentDescription');
    if (nameEl) nameEl.value = '';
    if (amountEl) amountEl.value = '';
    if (dateEl) dateEl.value = '';
    if (dueDateEl) dueDateEl.value = '';
    if (descEl) descEl.value = '';
    // Clear give form
    const owedNameEl = document.getElementById('owedPersonName');
    const owedAmountEl = document.getElementById('owedAmount');
    const owedDateEl = document.getElementById('owedDate');
    const owedDueDateEl = document.getElementById('owedDueDate');
    const owedDescEl = document.getElementById('owedDescription');
    if (owedNameEl) owedNameEl.value = '';
    if (owedAmountEl) owedAmountEl.value = '';
    if (owedDateEl) owedDateEl.value = '';
    if (owedDueDateEl) owedDueDateEl.value = '';
    if (owedDescEl) owedDescEl.value = '';
  }
}

function switchLentTab(tab) {
  const receiveTabBtn = document.getElementById('receiveTabBtn');
  const giveTabBtn = document.getElementById('giveTabBtn');
  const receiveTabContent = document.getElementById('receiveTabContent');
  const giveTabContent = document.getElementById('giveTabContent');
  
  if (tab === 'receive') {
    receiveTabBtn.classList.add('active');
    giveTabBtn.classList.remove('active');
    receiveTabContent.style.display = 'block';
    giveTabContent.style.display = 'none';
  } else {
    giveTabBtn.classList.add('active');
    receiveTabBtn.classList.remove('active');
    giveTabContent.style.display = 'block';
    receiveTabContent.style.display = 'none';
  }
}

async function saveLentMoney(type) {
  if (type === 'receive') {
    const nameEl = document.getElementById('lentPersonName');
    const amountEl = document.getElementById('lentAmount');
    const dateEl = document.getElementById('lentDate');
    const dueDateEl = document.getElementById('lentDueDate');
    const descEl = document.getElementById('lentDescription');
    const errorEl = document.getElementById('lendError');
    
    if (!nameEl || !amountEl || !dateEl || !errorEl) return;
    
    const personName = nameEl.value.trim();
    const amount = parseFloat(amountEl.value);
    const date = dateEl.value;
    const dueDate = dueDateEl ? dueDateEl.value : null;
    const description = descEl ? descEl.value.trim() : '';
    
    if (!personName || !amount || !date) {
      errorEl.textContent = 'Please fill in all required fields.';
      errorEl.hidden = false;
      return;
    }
    
    try {
      const { data, error } = await supabase.from('pending_money').insert({
        user_id: currentUser.id,
        type: 'receive',
        person_name: personName,
        amount,
        date,
        due_date: dueDate,
        description,
        status: 'pending'
      }).select().single();
      
      if (error) {
        if (error.code === '42P01') {
          errorEl.textContent = 'Database migration not run. Please run migration for pending money.';
        } else {
          throw error;
        }
      }
      
      if (data) {
        lentMoney.unshift(data);
        renderLentMoneyList();
        
        // Clear form
        nameEl.value = '';
        amountEl.value = '';
        dateEl.value = '';
        dueDateEl.value = '';
        descEl.value = '';
      }
      
    } catch (error) {
      console.error('Error saving pending money:', error);
      errorEl.textContent = 'Failed to save. Please try again.';
      errorEl.hidden = false;
    }
  } else if (type === 'give') {
    const nameEl = document.getElementById('owedPersonName');
    const amountEl = document.getElementById('owedAmount');
    const dateEl = document.getElementById('owedDate');
    const dueDateEl = document.getElementById('owedDueDate');
    const descEl = document.getElementById('owedDescription');
    const errorEl = document.getElementById('owedError');
    
    if (!nameEl || !amountEl || !dateEl || !errorEl) return;
    
    const personName = nameEl.value.trim();
    const amount = parseFloat(amountEl.value);
    const date = dateEl.value;
    const dueDate = dueDateEl ? dueDateEl.value : null;
    const description = descEl ? descEl.value.trim() : '';
    
    if (!personName || !amount || !date) {
      errorEl.textContent = 'Please fill in all required fields.';
      errorEl.hidden = false;
      return;
    }
    
    try {
      const { data, error } = await supabase.from('pending_money').insert({
        user_id: currentUser.id,
        type: 'give',
        person_name: personName,
        amount,
        date,
        due_date: dueDate,
        description,
        status: 'pending'
      }).select().single();
      
      if (error) {
        if (error.code === '42P01') {
          errorEl.textContent = 'Database migration not run. Please run migration for pending money.';
        } else {
          throw error;
        }
      }
      
      if (data) {
        lentMoney.unshift(data);
        renderOwedMoneyList();
        
        // Clear form
        nameEl.value = '';
        amountEl.value = '';
        dateEl.value = '';
        dueDateEl.value = '';
        descEl.value = '';
      }
      
    } catch (error) {
      console.error('Error saving pending money:', error);
      errorEl.textContent = 'Failed to save. Please try again.';
      errorEl.hidden = false;
    }
  }
}

function renderLentMoneyList() {
  const listEl = document.getElementById('lentMoneyList');
  if (!listEl) return;
  
  const pendingReceive = lentMoney.filter(l => l.type === 'receive' && l.status === 'pending');
  
  if (pendingReceive.length === 0) {
    listEl.innerHTML = '<p style="color:#666; font-size:13px; text-align:center; padding:20px;">No money to receive yet.</p>';
    return;
  }
  
  listEl.innerHTML = pendingReceive.map(l => `
    <div class="lent-item lent">
      <div class="lent-info">
        <div class="lent-person">${l.person_name}</div>
        <div class="lent-meta">Lent: ${l.date} • Due: ${l.due_date || 'Not specified'}</div>
        ${l.description ? `<div class="lent-meta">${l.description}</div>` : ''}
      </div>
      <div class="lent-amount">₹${parseFloat(l.amount).toFixed(2)}</div>
      <div class="lent-actions">
        <button class="receive-btn" onclick="markAsCompleted('${l.id}')">Received</button>
        <button class="delete-btn" onclick="deletePendingMoney('${l.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderOwedMoneyList() {
  const listEl = document.getElementById('owedMoneyList');
  if (!listEl) return;
  
  const pendingGive = lentMoney.filter(l => l.type === 'give' && l.status === 'pending');
  
  if (pendingGive.length === 0) {
    listEl.innerHTML = '<p style="color:#666; font-size:13px; text-align:center; padding:20px;">No money to give yet.</p>';
    return;
  }
  
  listEl.innerHTML = pendingGive.map(l => `
    <div class="lent-item lent" style="border-left-color:#dc2626">
      <div class="lent-info">
        <div class="lent-person">${l.person_name}</div>
        <div class="lent-meta">Owed: ${l.date} • Due: ${l.due_date || 'Not specified'}</div>
        ${l.description ? `<div class="lent-meta">${l.description}</div>` : ''}
      </div>
      <div class="lent-amount" style="color:#dc2626">₹${parseFloat(l.amount).toFixed(2)}</div>
      <div class="lent-actions">
        <button class="receive-btn" onclick="markAsCompleted('${l.id}')">Paid</button>
        <button class="delete-btn" onclick="deletePendingMoney('${l.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function markAsCompleted(id) {
  if (!confirm('Mark this as completed?')) return;
  
  try {
    const completedDate = localDateString();
    const { error } = await supabase.from('pending_money').update({ 
      status: 'completed',
      completed_date: completedDate
    }).eq('id', id);
    
    if (error) throw error;
    
    // Update local data
    const item = lentMoney.find(l => l.id === id);
    if (item) {
      item.status = 'completed';
      item.completed_date = completedDate;
    }
    
    renderLentMoneyList();
    renderOwedMoneyList();
    
  } catch (error) {
    console.error('Error marking as completed:', error);
    alert('Failed to update. Please try again.');
  }
}

async function deletePendingMoney(id) {
  if (!confirm('Delete this record?')) return;
  
  try {
    const { error } = await supabase.from('pending_money').delete().eq('id', id);
    
    if (error) throw error;
    
    lentMoney = lentMoney.filter(l => l.id !== id);
    renderLentMoneyList();
    renderOwedMoneyList();
    
  } catch (error) {
    console.error('Error deleting pending money:', error);
    alert('Failed to delete. Please try again.');
  }
}

// Main Analytics Update Function
function updateAnalytics() {
  const period = document.getElementById('analyticsPeriod').value;
  const customDateRange = document.getElementById('customDateRange');
  
  if (period === 'custom') {
    customDateRange.style.display = 'flex';
  } else {
    customDateRange.style.display = 'none';
  }
  
  // Calculate date range
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let startDate, endDate = localDateString(today);
  
  if (period === 'custom') {
    startDate = document.getElementById('analyticsStartDate').value;
    endDate = document.getElementById('analyticsEndDate').value;
    if (!startDate || !endDate) return;
  } else {
    const days = parseInt(period);
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate = localDateString(startDate);
  }
  
  // Update all analytics sections
  updateOverviewCards(startDate, endDate);
  updateTaskAnalysis(startDate, endDate);
  updateExpenseAnalysis(startDate, endDate);
  updateDisciplineAnalysis(startDate, endDate);
  updatePersonalGrowth(startDate, endDate);
  updateSmartInsights(startDate, endDate);
  updatePersonalRecords();
}

function updateOverviewCards(startDate, endDate) {
  // Task completion
  const taskDates = getDateRange(startDate, endDate);
  let totalTasks = 0;
  let completedTasks = 0;
  
  taskDates.forEach(date => {
    const stats = getDayStats(date);
    totalTasks += stats.total;
    completedTasks += stats.completed;
  });
  
  const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Financial data
  const periodTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
  const totalIncome = periodTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpenses = periodTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const netSavings = totalIncome - totalExpenses;
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);
  
  // Discipline score (from selected period)
  const disciplineScore = calculateDisciplineScore(startDate, endDate);
  
  // Update UI
  document.getElementById('overviewTasksCompleted').textContent = completedTasks;
  document.getElementById('overviewTaskPercentage').textContent = `${taskPercentage}%`;
  document.getElementById('overviewIncome').textContent = `₹${totalIncome.toFixed(0)}`;
  document.getElementById('overviewExpenses').textContent = `₹${totalExpenses.toFixed(0)}`;
  document.getElementById('overviewBalance').textContent = `₹${totalBalance.toFixed(0)}`;
  document.getElementById('overviewSavings').textContent = `₹${netSavings.toFixed(0)}`;
  document.getElementById('overviewDiscipline').textContent = disciplineScore;
}

function updateTaskAnalysis(startDate, endDate) {
  const taskDates = getDateRange(startDate, endDate);
  let totalCreated = 0;
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  const dayStats = {};
  
  taskDates.forEach(date => {
    const stats = getDayStats(date);
    totalCreated += stats.total;
    completed += stats.completed;
    pending += stats.pending;
    overdue += stats.overdue;
    dayStats[date] = stats;
  });
  
  const completionRate = totalCreated > 0 ? Math.round((completed / totalCreated) * 100) : 0;
  const avgPerDay = taskDates.length > 0 ? (completed / taskDates.length).toFixed(1) : 0;
  
  // Find best and worst days
  let bestDay = '—';
  let worstDay = '—';
  let bestDayVal = 0;
  let worstDayVal = Infinity;
  
  Object.entries(dayStats).forEach(([date, stats]) => {
    if (stats.total > 0) {
      if (stats.completed > bestDayVal) {
        bestDayVal = stats.completed;
        bestDay = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
      }
      if (stats.completed < worstDayVal) {
        worstDayVal = stats.completed;
        worstDay = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
      }
    }
  });
  
  // Update UI
  document.getElementById('taskTotalCreated').textContent = totalCreated;
  document.getElementById('taskCompleted').textContent = completed;
  document.getElementById('taskPending').textContent = pending;
  document.getElementById('taskOverdue').textContent = overdue;
  document.getElementById('taskCompletionRate').textContent = `${completionRate}%`;
  document.getElementById('taskAvgPerDay').textContent = avgPerDay;
  document.getElementById('taskBestDay').textContent = bestDay;
  document.getElementById('taskWorstDay').textContent = worstDay;
  
  // Update charts
  renderSimpleBarChart('taskCompletionChart', [
    { label: 'Completed', value: completed, color: '#16a34a' },
    { label: 'Pending', value: pending, color: '#ffc107' },
    { label: 'Overdue', value: overdue, color: '#dc2626' }
  ]);
  
  // Priority distribution
  const priorities = { High: 0, Medium: 0, Low: 0 };
  tasks.filter(t => t.date >= startDate && t.date <= endDate).forEach(task => {
    if (priorities[task.priority] !== undefined) {
      priorities[task.priority]++;
    }
  });
  
  renderSimpleBarChart('taskPriorityChart', [
    { label: 'High', value: priorities.High, color: '#dc2626' },
    { label: 'Medium', value: priorities.Medium, color: '#ffc107' },
    { label: 'Low', value: priorities.Low, color: '#16a34a' }
  ]);
}

function updateExpenseAnalysis(startDate, endDate) {
  const periodTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
  
  const totalIncome = periodTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpenses = periodTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const netSavings = totalIncome - totalExpenses;
  
  const days = getDateRange(startDate, endDate).length;
  const avgDailySpend = days > 0 ? (totalExpenses / days).toFixed(0) : 0;
  
  // Find highest and lowest spending days
  const dailyExpenses = {};
  periodTransactions.filter(t => t.transaction_type === 'expense').forEach(t => {
    dailyExpenses[t.date] = (dailyExpenses[t.date] || 0) + parseFloat(t.amount || 0);
  });
  
  let highestDay = '—';
  let lowestDay = '—';
  let highestVal = 0;
  let lowestVal = Infinity;
  
  Object.entries(dailyExpenses).forEach(([date, amount]) => {
    if (amount > highestVal) {
      highestVal = amount;
      highestDay = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (amount < lowestVal) {
      lowestVal = amount;
      lowestDay = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  });
  
  // Category breakdown
  const categories = {};
  periodTransactions.filter(t => t.transaction_type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount || 0);
  });
  
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : '—';
  
  // Account balances
  const accountBalances = accounts.map(acc => `${acc.name}: ₹${parseFloat(acc.current_balance || 0).toFixed(0)}`).join(', ') || '—';
  
  // Update UI
  document.getElementById('expenseIncome').textContent = `₹${totalIncome.toFixed(0)}`;
  document.getElementById('expenseTotal').textContent = `₹${totalExpenses.toFixed(0)}`;
  document.getElementById('expenseSavings').textContent = `₹${netSavings.toFixed(0)}`;
  document.getElementById('expenseAvgDaily').textContent = `₹${avgDailySpend}`;
  document.getElementById('expenseHighestDay').textContent = highestDay;
  document.getElementById('expenseLowestDay').textContent = lowestDay;
  document.getElementById('expenseTopCategory').textContent = topCategory;
  document.getElementById('expenseAccountBalances').textContent = accountBalances;
  
  // Update charts
  renderSimpleBarChart('incomeExpenseChart', [
    { label: 'Income', value: totalIncome, color: '#16a34a' },
    { label: 'Expenses', value: totalExpenses, color: '#dc2626' }
  ]);
  
  const topCategories = sortedCategories.slice(0, 5).map(([cat, amt]) => ({
    label: cat,
    value: amt,
    color: '#128C7E'
  }));
  
  renderSimpleBarChart('categoryChart', topCategories);
}

function updateDisciplineAnalysis(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  const disciplineScore = calculateDisciplineScore(startDate, endDate);
  
  // Calculate streaks
  const currentStreak = calculateStreak();
  const bestStreak = calculateBestStreak(startDate, endDate);
  
  // Calculate perfect days
  let perfectDays = 0;
  let activeDays = 0;
  
  dates.forEach(date => {
    const stats = getDayStats(date);
    if (stats.total > 0) {
      activeDays++;
      if (stats.percentage === 100) perfectDays++;
    }
  });
  
  const consistency = activeDays > 0 ? Math.round((perfectDays / activeDays) * 100) : 0;
  
  // Update UI
  document.getElementById('disciplineScoreDetail').textContent = disciplineScore;
  document.getElementById('disciplineCurrentStreak').textContent = `${currentStreak} days`;
  document.getElementById('disciplineBestStreak').textContent = `${bestStreak} days`;
  document.getElementById('disciplinePerfectDays').textContent = perfectDays;
  document.getElementById('disciplineConsistency').textContent = `${consistency}%`;
  
  // Update circular progress
  const ring = document.getElementById('disciplineRingDetail');
  if (ring) {
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (disciplineScore / 100) * circumference;
    ring.style.strokeDashoffset = offset;
  }
  
  // Render discipline trend chart
  renderDisciplineTrendChart(dates);
}

function updatePersonalGrowth(startDate, endDate) {
  // Calculate previous period
  const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1);
  
  const prevStartStr = localDateString(prevStartDate);
  const prevEndStr = localDateString(prevEndDate);
  
  // Current period stats
  const currentTaskStats = getPeriodTaskStats(startDate, endDate);
  const currentExpenseStats = getPeriodExpenseStats(startDate, endDate);
  
  // Previous period stats
  const prevTaskStats = getPeriodTaskStats(prevStartStr, prevEndStr);
  const prevExpenseStats = getPeriodExpenseStats(prevStartStr, prevEndStr);
  
  // Calculate changes
  const taskChange = calculatePercentageChange(prevTaskStats.completed, currentTaskStats.completed);
  const expenseChange = calculatePercentageChange(prevExpenseStats.expenses, currentExpenseStats.expenses);
  const savingsChange = calculatePercentageChange(prevExpenseStats.savings, currentExpenseStats.savings);
  
  const currentDiscipline = calculateDisciplineScore(startDate, endDate);
  const prevDiscipline = calculateDisciplineScore(prevStartStr, prevEndStr);
  const disciplineChange = currentDiscipline - prevDiscipline;
  
  // Update UI
  updateGrowthMetric('growthTaskChange', taskChange, 'tasks');
  updateGrowthMetric('growthExpenseChange', expenseChange, 'spending');
  updateGrowthMetric('growthSavingsChange', savingsChange, 'savings');
  updateGrowthMetric('growthDisciplineChange', disciplineChange, 'points');
  
  // Generate insight
  let insight = 'Complete tasks and track expenses to see your growth trends.';
  if (taskChange > 0 && savingsChange > 0) {
    insight = 'Great progress! You completed more tasks and saved more compared to the previous period.';
  } else if (taskChange > 0) {
    insight = 'Your task completion improved this period. Keep it up!';
  } else if (savingsChange > 0) {
    insight = 'Your savings increased compared to the previous period. Excellent financial discipline!';
  } else if (taskChange < 0 && expenseChange > 0) {
    insight = 'Task completion decreased and spending increased. Focus on both areas for improvement.';
  }
  
  document.getElementById('growthInsight').textContent = insight;
}

function updateSmartInsights(startDate, endDate) {
  const insights = [];
  
  // Task insights
  const dates = getDateRange(startDate, endDate);
  const weekendTasks = 0;
  const weekdayTasks = 0;
  
  dates.forEach(date => {
    const d = new Date(`${date}T12:00:00`);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const stats = getDayStats(date);
    if (isWeekend) {
      weekendTasks += stats.completed;
    } else {
      weekdayTasks += stats.completed;
    }
  });
  
  if (weekdayTasks > weekendTasks * 1.5) {
    insights.push('You complete more tasks on weekdays than weekends. Consider maintaining some weekend productivity.');
  } else if (weekendTasks > weekdayTasks * 1.5) {
    insights.push('Great weekend productivity! You\'re making good use of your free time.');
  }
  
  // Expense insights
  const categories = {};
  transactions.filter(t => t.date >= startDate && t.date <= endDate && t.transaction_type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount || 0);
  });
  
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const totalExpenses = Object.values(categories).reduce((a, b) => a + b, 0);
    const topCategory = sortedCategories[0];
    const topPercentage = ((topCategory[1] / totalExpenses) * 100).toFixed(0);
    insights.push(`Your ${topCategory[0]} expenses account for ${topPercentage}% of your spending this period.`);
  }
  
  // Discipline insights
  const disciplineScore = calculateDisciplineScore(startDate, endDate);
  if (disciplineScore >= 90) {
    insights.push('Outstanding discipline! Your consistency is excellent.');
  } else if (disciplineScore >= 70) {
    insights.push('Good consistency! Small improvements could push you to excellence.');
  } else if (disciplineScore >= 50) {
    insights.push('You\'re building momentum. Focus on completing more planned tasks.');
  } else if (disciplineScore > 0) {
    insights.push('There\'s room for improvement. Try to plan fewer tasks and complete them consistently.');
  }
  
  // Update UI
  const insightsContainer = document.getElementById('smartInsights');
  if (insights.length > 0) {
    insightsContainer.innerHTML = insights.map(insight => 
      `<div class="insight-item">${insight}</div>`
    ).join('');
  } else {
    insightsContainer.innerHTML = '<p class="empty-insights">Complete tasks and track expenses to receive personalized insights.</p>';
  }
}

function updatePersonalRecords() {
  // Most tasks in one day
  let mostTasksInDay = 0;
  const dayTaskCounts = {};
  
  tasks.forEach(task => {
    if (task.date) {
      dayTaskCounts[task.date] = (dayTaskCounts[task.date] || 0) + 1;
    }
  });
  
  Object.values(dayTaskCounts).forEach(count => {
    if (count > mostTasksInDay) mostTasksInDay = count;
  });
  
  // Longest streak
  const longestStreak = calculateLongestStreak();
  
  // Best weekly rate
  const bestWeeklyRate = calculateBestWeeklyRate();
  
  // Highest monthly savings
  const bestMonthlySavings = calculateBestMonthlySavings();
  
  // Update UI
  document.getElementById('recordMostTasks').textContent = mostTasksInDay;
  document.getElementById('recordLongestStreak').textContent = `${longestStreak} days`;
  document.getElementById('recordBestWeekly').textContent = `${bestWeeklyRate}%`;
  document.getElementById('recordBestSavings').textContent = `₹${bestMonthlySavings.toFixed(0)}`;
}

// Helper functions
function getDateRange(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  while (start <= end) {
    dates.push(localDateString(start));
    start.setDate(start.getDate() + 1);
  }
  
  return dates;
}

function calculateDisciplineScore(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  const values = dates.map(date => getDayStats(date).total ? getDayStats(date).percentage : null);
  const validValues = values.filter(v => v !== null);
  
  let score = 0;
  
  if (validValues.length > 0) {
    const avgCompletion = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const activeDaysRatio = validValues.length / dates.length;
    const badDays = validValues.filter(v => v < 50).length;
    const consistencyFactor = Math.max(0, 1 - (badDays / validValues.length));
    
    score = Math.round(
      (avgCompletion * 0.5) +
      (consistencyFactor * 100 * 0.3) +
      (activeDaysRatio * 100 * 0.2)
    );
  }
  
  return score;
}

function calculateBestStreak(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  let longestStreak = 0;
  let currentStreak = 0;
  
  dates.forEach(date => {
    const stats = getDayStats(date);
    if (stats.total > 0 && stats.percentage >= 75) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return longestStreak;
}

function getPeriodTaskStats(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  let completed = 0;
  let total = 0;
  
  dates.forEach(date => {
    const stats = getDayStats(date);
    completed += stats.completed;
    total += stats.total;
  });
  
  return { completed, total };
}

function getPeriodExpenseStats(startDate, endDate) {
  const periodTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
  
  const income = periodTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const expenses = periodTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  
  return { income, expenses, savings: income - expenses };
}

function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return Math.round(((newValue - oldValue) / oldValue) * 100);
}

function updateGrowthMetric(elementId, change, suffix) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  el.textContent = change > 0 ? `+${change}%` : `${change}%`;
  el.className = 'growth-change';
  if (change > 0) el.classList.add('positive');
  else if (change < 0) el.classList.add('negative');
  else el.classList.add('neutral');
}

function calculateLongestStreak() {
  const dates = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dates.push(localDateString(d));
  }
  
  let longestStreak = 0;
  let currentStreak = 0;
  
  dates.forEach(date => {
    const stats = getDayStats(date);
    if (stats.total > 0 && stats.percentage >= 75) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return longestStreak;
}

function calculateBestWeeklyRate() {
  const weeks = 12;
  let bestRate = 0;
  
  for (let w = 0; w < weeks; w++) {
    const weekDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - (w * 7) - i);
      weekDates.push(localDateString(d));
    }
    
    let total = 0;
    let completed = 0;
    weekDates.forEach(date => {
      const stats = getDayStats(date);
      total += stats.total;
      completed += stats.completed;
    });
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    bestRate = Math.max(bestRate, rate);
  }
  
  return bestRate;
}

function calculateBestMonthlySavings() {
  const months = 12;
  let bestSavings = 0;
  
  for (let m = 0; m < months; m++) {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    start.setDate(1);
    start.setMonth(start.getMonth() - m);
    
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    
    const startDate = localDateString(start);
    const endDate = localDateString(end);
    
    const stats = getPeriodExpenseStats(startDate, endDate);
    bestSavings = Math.max(bestSavings, stats.savings);
  }
  
  return bestSavings;
}

function renderSimpleBarChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container || !data || data.length === 0) {
    if (container) container.innerHTML = '<p style="color:#999; font-size:12px; text-align:center; padding:20px;">No data available</p>';
    return;
  }
  
  const maxValue = Math.max(...data.map(d => d.value));
  
  container.innerHTML = data.map(item => {
    const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
    return `
      <div class="bar-item">
        <span class="bar-label">${item.label}</span>
        <div class="bar-wrapper">
          <div class="bar-fill" style="width:${percentage}%; background:${item.color}"></div>
        </div>
        <span class="bar-value">${typeof item.value === 'number' ? item.value.toFixed(0) : item.value}</span>
      </div>
    `;
  }).join('');
}

function renderDisciplineTrendChart(dates) {
  const svg = document.getElementById('disciplineTrendChart');
  if (!svg) return;
  
  const values = dates.map(date => getDayStats(date).total ? getDayStats(date).percentage : null);
  
  const width = 640, height = 220, left = 45, right = 20, top = 30, bottom = 45;
  const plotW = width - left - right, plotH = height - top - bottom;
  const y = v => top + (100 - v) / 100 * plotH;
  const x = i => left + (dates.length === 1 ? plotW / 2 : i / (dates.length - 1) * plotW);
  
  let svgMarkup = '';
  
  // Grid lines
  [0, 50, 100].forEach(v => {
    if (v > 0) {
      svgMarkup += `<line class="gridline" x1="${left}" y1="${y(v)}" x2="${width - right}" y2="${y(v)}"></line>`;
    }
    svgMarkup += `<text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" fill="#999" font-size="11">${v}%</text>`;
  });
  
  // Create line path
  const points = values.map((v, i) => v === null ? null : [x(i), y(v)]);
  let linePath = '';
  
  if (points.some(p => p !== null)) {
    points.forEach((p, i) => {
      if (p !== null) {
        if (linePath === '') {
          linePath = `M ${p[0]} ${p[1]}`;
        } else {
          linePath += ` L ${p[0]} ${p[1]}`;
        }
      }
    });
    
    svgMarkup += `<path d="${linePath}" class="chart-line" fill="none"></path>`;
    
    // Add points
    points.forEach((p, i) => {
      if (p) {
        const value = values[i];
        const color = value > 75 ? '#25D366' : value >= 50 ? '#ffc107' : '#dc3545';
        svgMarkup += `<circle class="chart-point" cx="${p[0]}" cy="${p[1]}" r="6" fill="${color}" stroke="white" stroke-width="2"></circle>`;
      }
    });
  }
  
  // Date labels
  dates.forEach((date, i) => {
    if (i % Math.ceil(dates.length / 6) === 0 || i === dates.length - 1) {
      const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      svgMarkup += `<text x="${x(i)}" y="${height - 15}" text-anchor="middle" fill="#999" font-size="11">${label}</text>`;
    }
  });
  
  // Gradient
  svgMarkup += `
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#128C7E;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#128C7E;stop-opacity:0" />
      </linearGradient>
    </defs>
  `;
  
  if (values.every(v => v === null)) {
    svgMarkup += `<text class="empty-chart" x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#999" font-size="14">Complete tasks to see your discipline trend.</text>`;
  }
  
  svg.innerHTML = svgMarkup;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('appContainer').style.display = 'none';

  // Initialize premium auth features
  initQuoteRotation();

  // Load custom categories
  loadCustomCategories();

  // Password strength validation
  const signupPassword = document.getElementById('signupPassword');
  if (signupPassword) {
    signupPassword.addEventListener('input', (e) => {
      updatePasswordStrength(e.target.value);
      checkPasswordMatch();
    });
  }

  // Password match validation
  const signupConfirmPassword = document.getElementById('signupConfirmPassword');
  if (signupConfirmPassword) {
    signupConfirmPassword.addEventListener('input', checkPasswordMatch);
  }

  if (!window.supabase || !window.supabase.auth) {
    console.error('Supabase not initialized!');
    document.getElementById('authScreen').hidden = false;
    showAuthMode('login');
    return;
  }

  // Check for password reset in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('type') === 'recovery') {
    // Show auth screen if not already visible
    document.getElementById('authScreen').hidden = false;
    document.getElementById('appContainer').style.display = 'none';
    showAuthMode('login');
    // Open reset password modal
    document.getElementById('resetPasswordModal').classList.add('show');
    showAuthSuccess('Password reset link detected. Please enter your new password.');
  }

  const { data: { session } } = await window.supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadUserData();
    enterApp();
  } else {
    document.getElementById('authScreen').hidden = false;
    showAuthMode('login');
  }
});
