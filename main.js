document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const addActivityBtn = document.getElementById('addActivityBtn');
    const syncDeviceBtn = document.getElementById('syncDeviceBtn');
    const setGoalBtn = document.getElementById('setGoalBtn');
    const connectDeviceBtn = document.getElementById('connectDeviceBtn');
    const connectionStatus = document.getElementById('connectionStatus');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            loginBtn.disabled = true;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (!username || !password) {
                alert('Please enter both username and password');
                loginBtn.disabled = false;
                return;
            }
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });
                const result = await response.json();
                if (result.success) {
                    window.location.href = '/';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('Login failed: ' + error.message);
            } finally {
                loginBtn.disabled = false;
            }
        }, { once: true });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            registerBtn.disabled = true;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (!username || !password) {
                alert('Please enter both username and password');
                registerBtn.disabled = false;
                return;
            }
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });
                const result = await response.json();
                if (result.success) {
                    window.location.href = '/login';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('Registration failed: ' + error.message);
            } finally {
                registerBtn.disabled = false;
            }
        }, { once: true });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/logout';
        }, { once: true });
    }

    if (connectDeviceBtn) {
        connectDeviceBtn.addEventListener('click', async () => {
            connectDeviceBtn.disabled = true;
            const deviceModel = document.getElementById('deviceModel').value;
            try {
                const response = await fetch('/connect_device', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_model: deviceModel })
                });
                const result = await response.json();
                if (result.success) {
                    connectionStatus.textContent = result.message;
                    connectionStatus.style.color = '#10b981';
                } else {
                    connectionStatus.textContent = result.message;
                    connectionStatus.style.color = '#ef4444';
                }
            } catch (error) {
                connectionStatus.textContent = 'Connection failed';
                connectionStatus.style.color = '#ef4444';
            } finally {
                connectDeviceBtn.disabled = false;
            }
        }, { once: true });
    }

    if (syncDeviceBtn) {
        syncDeviceBtn.addEventListener('click', async () => {
            syncDeviceBtn.disabled = true;
            try {
                // Fetch smart device data
                const response = await fetch('/smart_device_data');
                const data = await response.json();
                if (data.success === false) {
                    alert(data.message);
                    syncDeviceBtn.disabled = false;
                    return;
                }
                // Populate form fields
                document.getElementById('steps').value = data.steps;
                document.getElementById('calories').value = data.calories;
                document.getElementById('duration').value = data.duration;
                connectionStatus.textContent = `Synced with ${data.device_model}`;
                connectionStatus.style.color = '#10b981';

                // Automatically add to activity record
                const activityType = document.getElementById('activityType').value || 'Walking'; // Default to Walking
                const addResponse = await fetch('/add_activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activity_type: activityType,
                        steps: data.steps,
                        calories: data.calories,
                        duration: data.duration
                    })
                });
                const addResult = await addResponse.json();
                if (addResult.success) {
                    connectionStatus.textContent = `Synced and added activity from ${data.device_model}`;
                    loadActivities();
                    loadReport();
                    // Clear form fields
                    document.getElementById('steps').value = '';
                    document.getElementById('calories').value = '';
                    document.getElementById('duration').value = '';
                } else {
                    alert(addResult.message);
                }
            } catch (error) {
                alert('Failed to sync and add activity: ' + error.message);
            } finally {
                syncDeviceBtn.disabled = false;
            }
        }, { once: true });
    }

    if (addActivityBtn) {
        addActivityBtn.addEventListener('click', async () => {
            addActivityBtn.disabled = true;
            const activityType = document.getElementById('activityType').value;
            const steps = parseInt(document.getElementById('steps').value);
            const calories = parseFloat(document.getElementById('calories').value);
            const duration = parseFloat(document.getElementById('duration').value);
            if (!activityType || isNaN(steps) || isNaN(calories) || isNaN(duration)) {
                alert('Please fill in all fields with valid numbers');
                addActivityBtn.disabled = false;
                return;
            }
            try {
                const response = await fetch('/add_activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activity_type: activityType, steps, calories, duration })
                });
                const result = await response.json();
                if (result.success) {
                    loadActivities();
                    loadReport();
                    document.getElementById('steps').value = '';
                    document.getElementById('calories').value = '';
                    document.getElementById('duration').value = '';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('Failed to add activity: ' + error.message);
            } finally {
                addActivityBtn.disabled = false;
            }
        }, { once: true });
    }

    if (setGoalBtn) {
        setGoalBtn.addEventListener('click', async () => {
            setGoalBtn.disabled = true;
            const goalType = document.getElementById('goalType').value;
            const target = parseFloat(document.getElementById('goalTarget').value);
            if (!goalType || isNaN(target)) {
                alert('Please select a goal type and enter a valid target');
                setGoalBtn.disabled = false;
                return;
            }
            try {
                const response = await fetch('/set_goal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ goal_type: goalType, target })
                });
                const result = await response.json();
                if (result.success) {
                    loadReport();
                    document.getElementById('goalTarget').value = '';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('Failed to set goal: ' + error.message);
            } finally {
                setGoalBtn.disabled = false;
            }
        }, { once: true });
    }

    async function loadActivities() {
        try {
            const response = await fetch('/get_activities');
            const activities = await response.json();
            const tableBody = document.getElementById('activityTable');
            if (tableBody) {
                tableBody.innerHTML = '';
                activities.forEach(activity => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="p-2">${activity.date}</td>
                        <td class="p-2">${activity.activity_type}</td>
                        <td class="p-2">${activity.steps}</td>
                        <td class="p-2">${activity.calories}</td>
                        <td class="p-2">${activity.duration}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Failed to load activities:', error);
        }
    }

    async function loadReport() {
        try {
            const response = await fetch('/get_report');
            const report = await response.json();
            document.getElementById('totalSteps').textContent = report.total_steps;
            document.getElementById('totalCalories').textContent = report.total_calories;
            document.getElementById('totalDuration').textContent = report.total_duration;
            const goalsList = document.getElementById('goalsList');
            goalsList.innerHTML = '<p><strong>Goals:</strong></p>';
            report.goals.forEach(goal => {
                const p = document.createElement('p');
                p.textContent = `${goal.goal_type}: ${goal.target}`;
                goalsList.appendChild(p);
            });

            const ctx = document.getElementById('activityChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Steps', 'Calories', 'Duration'],
                    datasets: [{
                        label: 'Total Activity',
                        data: [report.total_steps, report.total_calories, report.total_duration],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true } }
                }
            });
        } catch (error) {
            console.error('Failed to load report:', error);
        }
    }

    if (document.getElementById('activityTable')) {
        loadActivities();
        loadReport();
    }
});