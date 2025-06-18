document.addEventListener('DOMContentLoaded', function() {
    let allStudents = []; // Store all students data
    let currentStudentId = null; // Track currently selected student
    let currentView = 'individual'; // Track current dashboard view
    let currentComprehensiveView = 'table'; // Track comprehensive view type
    
    const studentList = document.getElementById('studentList');
    const studentDashboard = document.getElementById('studentDashboard');
    const studentSearchInput = document.getElementById('studentSearch');
    const performanceFilter = document.getElementById('performanceFilter');

    // Initialize the dashboard
    initializeDashboard();

    async function initializeDashboard() {
        try {
            await fetchStudents();
            updateNavigation();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }

    // Fetch student data from the backend
    async function fetchStudents() {
        try {
            showLoading('Loading students...');
            const response = await fetch('/api/students');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allStudents = await response.json();
            renderStudentList();
            hideLoading();
            
            // Update header stats
            updateHeaderStats();
            updateOverviewStats();
            
            // Show welcome message only after initial fetch
            showWelcomeMessage();
        } catch (error) {
            console.error('Error fetching students:', error);
            showError('Error loading students. Please check your connection and try again.');
            hideLoading();
        }
    }

    function updateHeaderStats() {
        const totalStudents = allStudents.length;
        const avgScore = calculateOverallAverage();
        const topPerformer = findTopPerformer();
        
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('avgScore').textContent = `${avgScore.toFixed(1)}%`;
        document.getElementById('topPerformerScore').textContent = topPerformer ? `${topPerformer.average_score.toFixed(1)}%` : '-';
    }

    function calculateOverallAverage() {
        if (allStudents.length === 0) return 0;
        const allScores = [];
        allStudents.forEach(student => {
            Object.values(student.performance).forEach(score => {
                if (typeof score === 'number' && score > 0) {
                    allScores.push(score);
                }
            });
        });
        return allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
    }

    function showWelcomeMessage() {
        if (currentView === 'individual') {
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'welcome-message success';
            welcomeDiv.innerHTML = `
                <h3>🎉 Welcome to Student Performance Analytics!</h3>
                <p>Loaded ${allStudents.length} students with performance data.</p>
                <p>Click on any student to view their detailed performance analysis.</p>
            `;
            studentDashboard.appendChild(welcomeDiv);
            
            // Remove welcome message after 5 seconds
            setTimeout(() => {
                if (welcomeDiv.parentNode) {
                    welcomeDiv.remove();
                }
            }, 5000);
        }
    }

    function renderStudentList(filterText = '', performanceFilterValue = 'all') {
        studentList.innerHTML = '';
        
        let filteredStudents = allStudents.filter(student => {
            const nameMatch = student.name.toLowerCase().includes(filterText.toLowerCase());
            const idMatch = student.id.toLowerCase().includes(filterText.toLowerCase());
            const textMatch = nameMatch || idMatch;
            
            if (!textMatch) return false;
            
            const avgScore = calculateAverageScore(student.performance);
            
            switch (performanceFilterValue) {
                case 'excellent':
                    return avgScore >= 90;
                case 'good':
                    return avgScore >= 80 && avgScore < 90;
                case 'satisfactory':
                    return avgScore >= 70 && avgScore < 80;
                case 'needs-improvement':
                    return avgScore < 70;
                default:
                    return true;
            }
        });

        if (filteredStudents.length === 0) {
            studentList.innerHTML = '<li class="no-results">No students found.</li>';
            return;
        }

        filteredStudents.forEach((student, index) => {
            const listItem = document.createElement('li');
            const avgScore = calculateAverageScore(student.performance);
            const performanceLevel = getPerformanceLevel(avgScore);
            
            listItem.innerHTML = `
                <span>${student.name}</span>
                <span class="performance-indicator">${avgScore.toFixed(1)}%</span>
            `;
            listItem.dataset.studentId = student.id;
            
            // Add staggered animation
            listItem.style.animationDelay = `${index * 0.1}s`;
            listItem.classList.add('fade-in');
            
            listItem.addEventListener('click', () => {
                // Remove active class from all items
                document.querySelectorAll('#studentList li').forEach(li => li.classList.remove('active'));
                // Add active class to clicked item
                listItem.classList.add('active');
                displayStudentDashboard(student.id);
                
                // Add click animation
                listItem.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    listItem.style.transform = '';
                }, 150);
            });
            
            // Add color coding based on performance
            if (avgScore >= 90) {
                listItem.style.borderLeft = '4px solid var(--success)';
            } else if (avgScore >= 80) {
                listItem.style.borderLeft = '4px solid var(--info)';
            } else if (avgScore >= 70) {
                listItem.style.borderLeft = '4px solid var(--warning)';
            } else {
                listItem.style.borderLeft = '4px solid var(--danger)';
            }
            
            studentList.appendChild(listItem);
        });
    }

    async function displayStudentDashboard(studentId) {
        try {
            currentStudentId = studentId;
            showLoading('Loading student data...');
            
            const response = await fetch(`/api/student/${studentId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const student = await response.json();

            if (student) {
                renderStudentDashboard(student);
                // Switch to individual view when a student's details are displayed
                showIndividualView();
            } else {
                showError('Student not found.');
            }
            hideLoading();
        } catch (error) {
            console.error('Error fetching student performance:', error);
            showError('Error loading student data. Please try again.');
            hideLoading();
        }
    }

    function renderStudentDashboard(student) {
        if (!student || !student.performance || !student.metrics) {
            studentDashboard.innerHTML = `
                <div class="error-message" style="margin:2rem auto; max-width:400px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Student data is unavailable or incomplete. Please try another student or reload the page.</span>
                </div>
            `;
            return;
        }
        const performanceData = student.performance;
        const metrics = student.metrics;
        const taskCount = metrics.total_tasks;
        const averageScore = metrics.average_score;
        const highestScore = metrics.highest_score;
        const lowestScore = metrics.lowest_score;
        const trend = metrics.trend;
        const performanceLevel = metrics.performance_level;
        const currentStatus = student.current_status;

        studentDashboard.innerHTML = `
            <div class="dashboard-header">
                <div class="header-content">
                    <h2><i class="fas fa-user-graduate"></i> ${student.name ? student.name : 'Student'}'s Performance Analytics</h2>
                    <p>Student ID: ${student.id ? student.id : '-'} | Current Status: ${currentStatus ? currentStatus : '-'}</p>
                </div>
            </div>
            
            <div class="overview-stats">
                <div class="overview-card">
                    <div class="card-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="card-content">
                        <h3>Average Score</h3>
                        <span>${isNaN(averageScore) ? '-' : averageScore.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="card-content">
                        <h3>Highest Score</h3>
                        <span>${isNaN(highestScore) ? '-' : highestScore.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <div class="card-content">
                        <h3>Tasks Completed</h3>
                        <span>${isNaN(taskCount) ? '-' : taskCount}</span>
                    </div>
                </div>
                <div class="overview-card">
                    <div class="card-icon">
                        <i class="fas fa-trending-up"></i>
                    </div>
                    <div class="card-content">
                        <h3>Performance Trend</h3>
                        <span>${trend ? trend : '-'}</span>
                    </div>
                </div>
            </div>

            <div class="performance-details" style="margin-top:2rem;">
                <h3 style="margin-bottom:1rem;"><i class="fas fa-chart-bar"></i> Performance Breakdown</h3>
                <div style="display:flex; flex-wrap:wrap; gap:2rem; align-items:flex-start;">
                    <div style="min-width:180px;">
                        <div style="font-weight:600; margin-bottom:0.5rem;">Performance Level:</div>
                        <div style="font-size:1.1rem;">${performanceLevel ? performanceLevel : '-'}</div>
                    </div>
                    <div style="min-width:120px;">
                        <div style="font-weight:600; margin-bottom:0.5rem;">Lowest Score:</div>
                        <div style="font-size:1.1rem;">${isNaN(lowestScore) ? '-' : lowestScore.toFixed(1)}%</div>
                    </div>
                    <div style="min-width:150px;">
                        <div style="font-weight:600; margin-bottom:0.5rem;">Completion Rate:</div>
                        <div style="font-size:1.1rem;">${metrics.completion_rate !== undefined && !isNaN(metrics.completion_rate) ? metrics.completion_rate.toFixed(1) : '-'}%</div>
                    </div>
                </div>
                <div class="progress-section" style="margin-top:1.5rem;">
                    <div style="font-weight:600; margin-bottom:0.5rem;">Overall Progress</div>
                    <div class="progress-bar" style="height:18px;">
                        <div class="progress-fill" style="width: ${isNaN(averageScore) ? 0 : averageScore}%; height:100%;"></div>
                    </div>
                    <span class="progress-text" style="font-size:1rem;">${isNaN(averageScore) ? '-' : averageScore.toFixed(1)}% Complete</span>
                </div>
            </div>

            <div id="performanceChartContainer" style="margin-top:2.5rem;">
                <h3 style="margin-bottom:1rem;"><i class="fas fa-chart-line"></i> Performance Growth Chart</h3>
                <canvas id="performanceChart" width="600" height="260"></canvas>
            </div>
        `;

        // Render the performance growth chart (hyperbolic style)
        renderPerformanceGrowthChart(performanceData);
    }

    function calculateAverageScore(performanceData) {
        const scores = Object.values(performanceData).filter(score => typeof score === 'number' && score > 0);
        return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    }

    function getPerformanceLevel(averageScore) {
        if (averageScore >= 90) return 'Excellent';
        if (averageScore >= 80) return 'Good';
        if (averageScore >= 70) return 'Satisfactory';
        if (averageScore >= 60) return 'Needs Improvement';
        return 'Poor';
    }

    function getPerformanceTrend(performanceData) {
        const scores = Object.values(performanceData).filter(score => typeof score === 'number' && score > 0);
        if (scores.length < 3) return 'Insufficient Data';
        
        const recentScores = scores.slice(-3);
        const earlierScores = scores.slice(0, -3);
        
        if (earlierScores.length === 0) return 'Stable';
        
        const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const earlierAvg = earlierScores.reduce((sum, score) => sum + score, 0) / earlierScores.length;
        
        if (recentAvg > earlierAvg + 5) return 'Improving';
        if (recentAvg < earlierAvg - 5) return 'Declining';
        return 'Stable';
    }

    // Defensive: Render a line chart showing hyperbolic-like growth using per-task scores as pseudo-weeks
    function renderPerformanceGrowthChart(performanceData) {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        // Get all scores, sorted as if by week (simulate growth)
        let scores = performanceData && typeof performanceData === 'object'
            ? Object.values(performanceData).filter(score => typeof score === 'number' && !isNaN(score))
            : [];

        // Defensive: Always plot at least two points
        if (!scores.length) {
            scores = [0, 0];
        } else if (scores.length === 1) {
            scores = [scores[0], scores[0]];
        }

        // If all scores are zero, use a demo growth curve for display
        const allZero = scores.every(v => v === 0);
        let blendedScores;
        if (allZero) {
            blendedScores = [10, 20, 35, 55, 75, 90];
        } else {
            // Simulate a hyperbolic growth: sort, then apply a curve
            scores = scores.sort((a, b) => a - b);
            const n = scores.length;
            const max = Math.max(...scores);
            const hyperbolicScores = scores.map((s, i) => n > 1 ? (max * (i / (i + 2))) : s);
            blendedScores = scores.map((s, i) => Math.round((s + hyperbolicScores[i]) / 2));
        }

        // X-axis: Week 1, Week 2, ...
        const labels = blendedScores.map((_, i) => `Week ${i + 1}`);

        // Destroy existing chart if it exists
        if (window.performanceChart) {
            window.performanceChart.destroy();
        }

        window.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Performance Growth',
                    data: blendedScores,
                    fill: false,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.15)',
                    tension: 0.5,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Score: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Score (%)',
                            color: '#2563eb',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: {
                            color: '#6b7280',
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.07)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Weeks',
                            color: '#2563eb',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: {
                            color: '#6b7280',
                            font: { size: 12 }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // Navigation Functions
    function updateNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        const activeLink = document.querySelector(`[onclick="show${currentView.charAt(0).toUpperCase() + currentView.slice(1)}View()"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Global navigation functions
    window.showIndividualView = function() {
        currentView = 'individual';
        updateNavigation();
        
        document.querySelectorAll('.dashboard-view').forEach(view => view.classList.remove('active'));
        document.getElementById('individualDashboard').classList.add('active');
        
        if (currentStudentId) {
            displayStudentDashboard(currentStudentId);
        }
    };

    window.showComprehensiveView = function() {
        currentView = 'comprehensive';
        updateNavigation();
        
        document.querySelectorAll('.dashboard-view').forEach(view => view.classList.remove('active'));
        document.getElementById('comprehensiveDashboard').classList.add('active');
        
        loadComprehensiveDashboard();
    };

    window.showAnalyticsView = function() {
        currentView = 'analytics';
        updateNavigation();
        
        document.querySelectorAll('.dashboard-view').forEach(view => view.classList.remove('active'));
        document.getElementById('analyticsDashboard').classList.add('active');
        
        loadAnalyticsDashboard();
    };

    function loadComprehensiveDashboard() {
        updateOverviewStats();
        renderComprehensiveContent();
    }

    function updateOverviewStats() {
        const totalStudents = allStudents.length;
        const avgScore = calculateOverallAverage();
        const topPerformer = findTopPerformer();
        const improvingCount = countImprovingStudents();
        
        document.getElementById('totalStudentsOverview').textContent = totalStudents;
        document.getElementById('avgScoreOverview').textContent = `${avgScore.toFixed(1)}%`;
        document.getElementById('topPerformer').textContent = topPerformer ? topPerformer.name : 'N/A';
        document.getElementById('improvingCount').textContent = improvingCount;
    }

    function findTopPerformer() {
        if (allStudents.length === 0) return null;
        return allStudents.reduce((top, student) => {
            const avgScore = calculateAverageScore(student.performance);
            return avgScore > top.average_score ? { ...student, average_score: avgScore } : top;
        }, { average_score: 0 });
    }

    function countImprovingStudents() {
        return allStudents.filter(student => {
            const trend = getPerformanceTrend(student.performance);
            return trend === 'Improving';
        }).length;
    }

    function renderComprehensiveContent() {
        const container = document.getElementById('comprehensiveContent');
        if (currentComprehensiveView === 'table') {
            renderTableView(container);
        } else {
            renderCardView(container);
        }
    }

    function renderTableView(container) {
        container.innerHTML = `
            <div class="table-container">
                <table class="students-table">
                    <thead>
                        <tr>
                            <th><i class="fas fa-user"></i> Student Name</th>
                            <th><i class="fas fa-id-card"></i> ID</th>
                            <th><i class="fas fa-chart-line"></i> Average Score</th>
                            <th><i class="fas fa-trophy"></i> Highest Score</th>
                            <th><i class="fas fa-tasks"></i> Tasks Completed</th>
                            <th><i class="fas fa-trending-up"></i> Trend</th>
                            <th><i class="fas fa-info-circle"></i> Status</th>
                            <th><i class="fas fa-eye"></i> Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allStudents.map(student => {
                            const avgScore = calculateAverageScore(student.performance);
                            const highestScore = Math.max(...Object.values(student.performance).filter(score => typeof score === 'number' && score > 0));
                            const taskCount = Object.values(student.performance).filter(score => typeof score === 'number' && score > 0).length;
                            const trend = getPerformanceTrend(student.performance);
                            const performanceClass = getPerformanceClass(avgScore);
                            
                            return `
                                <tr>
                                    <td>${student.name}</td>
                                    <td>${student.id}</td>
                                    <td class="average-score-cell ${performanceClass}">${avgScore.toFixed(1)}%</td>
                                    <td>${highestScore.toFixed(1)}%</td>
                                    <td>${taskCount}</td>
                                    <td class="trend-cell">
                                        <i class="${getTrendIcon(trend)}"></i>
                                        ${trend}
                                    </td>
                                    <td class="status-cell">
                                        <span class="status-${student.current_status?.toLowerCase().replace(' ', '-') || 'pending'}">
                                            ${student.current_status || 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="view-details-btn-table" onclick="displayStudentDashboard('${student.id}')">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderCardView(container) {
        container.innerHTML = `
            <div class="cards-grid">
                ${allStudents.map(student => {
                    const avgScore = calculateAverageScore(student.performance);
                    const highestScore = Math.max(...Object.values(student.performance).filter(score => typeof score === 'number' && score > 0));
                    const taskCount = Object.values(student.performance).filter(score => typeof score === 'number' && score > 0).length;
                    const trend = getPerformanceTrend(student.performance);
                    const performanceClass = getPerformanceClass(avgScore);
                    
                    return `
                        <div class="student-card">
                            <div class="card-header">
                                <h3>${student.name}</h3>
                                <span class="student-id">${student.id}</span>
                            </div>
                            <div class="card-body">
                                <div class="stat-row">
                                    <span class="stat-label">Average Score:</span>
                                    <span class="stat-value ${performanceClass}">${avgScore.toFixed(1)}%</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Highest Score:</span>
                                    <span class="stat-value">${highestScore.toFixed(1)}%</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Tasks Completed:</span>
                                    <span class="stat-value">${taskCount}</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Trend:</span>
                                    <span class="stat-value">
                                        <i class="${getTrendIcon(trend)}"></i>
                                        ${trend}
                                    </span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Status:</span>
                                    <span class="stat-value status-${student.current_status?.toLowerCase().replace(' ', '-') || 'pending'}">
                                        ${student.current_status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                            <div class="card-footer">
                                <button class="btn-primary" onclick="displayStudentDashboard('${student.id}')">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function getTrendIcon(trend) {
        switch (trend) {
            case 'Improving': return 'fas fa-arrow-up text-success';
            case 'Declining': return 'fas fa-arrow-down text-danger';
            case 'Stable': return 'fas fa-minus text-warning';
            default: return 'fas fa-question text-muted';
        }
    }

    function getPerformanceClass(avgScore) {
        if (avgScore >= 90) return 'excellent';
        if (avgScore >= 80) return 'good';
        if (avgScore >= 70) return 'satisfactory';
        if (avgScore >= 60) return 'needs-improvement';
        return 'poor';
    }

    function loadAnalyticsDashboard() {
        // Initialize analytics charts
        renderDistributionChart();
        renderTrendChart();
        renderTaskChart();
        renderHeatmap();
    }

    function renderDistributionChart() {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;

        const performanceLevels = {
            'Excellent': 0,
            'Good': 0,
            'Satisfactory': 0,
            'Needs Improvement': 0,
            'Poor': 0
        };

        allStudents.forEach(student => {
            const avgScore = calculateAverageScore(student.performance);
            const level = getPerformanceLevel(avgScore);
            performanceLevels[level]++;
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(performanceLevels),
                datasets: [{
                    data: Object.values(performanceLevels),
                    backgroundColor: [
                        '#10b981',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444',
                        '#6b7280'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    function renderTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        const trends = {
            'Improving': countImprovingStudents(),
            'Stable': allStudents.filter(s => getPerformanceTrend(s.performance) === 'Stable').length,
            'Declining': allStudents.filter(s => getPerformanceTrend(s.performance) === 'Declining').length
        };

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(trends),
                datasets: [{
                    label: 'Number of Students',
                    data: Object.values(trends),
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderTaskChart() {
        const ctx = document.getElementById('taskChart');
        if (!ctx) return;

        const taskNames = ['Spreadsheet', 'SQL', 'Power BI', 'Python', 'EDA', 'ML'];
        const taskAverages = taskNames.map(task => {
            const scores = allStudents.map(student => student.performance[task]).filter(score => typeof score === 'number' && score > 0);
            return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        });

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: taskNames,
                datasets: [{
                    label: 'Average Score',
                    data: taskAverages,
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    pointBackgroundColor: 'rgba(37, 99, 235, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    function renderHeatmap() {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;

        const taskNames = ['Spreadsheet', 'SQL', 'Power BI', 'Python', 'EDA', 'ML'];
        const studentNames = allStudents.slice(0, 10).map(s => s.name); // Show first 10 students

        let heatmapHTML = '<div class="heatmap">';
        heatmapHTML += '<div class="heatmap-header">';
        heatmapHTML += '<div class="heatmap-corner"></div>';
        taskNames.forEach(task => {
            heatmapHTML += `<div class="heatmap-task">${task}</div>`;
        });
        heatmapHTML += '</div>';

        studentNames.forEach(studentName => {
            const student = allStudents.find(s => s.name === studentName);
            heatmapHTML += '<div class="heatmap-row">';
            heatmapHTML += `<div class="heatmap-student">${studentName}</div>`;
            taskNames.forEach(task => {
                const score = student.performance[task] || 0;
                const intensity = Math.min(score / 100, 1);
                const color = `rgba(37, 99, 235, ${intensity})`;
                heatmapHTML += `<div class="heatmap-cell" style="background-color: ${color}" title="${studentName}: ${task} - ${score}%">${score}</div>`;
            });
            heatmapHTML += '</div>';
        });

        heatmapHTML += '</div>';
        container.innerHTML = heatmapHTML;
    }

    // Global functions for view switching
    window.switchView = function(view) {
        currentComprehensiveView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.view-btn').classList.add('active');
        renderComprehensiveContent();
    };

    // Search and filter functions
    window.searchStudent = function() {
        const searchTerm = studentSearchInput.value.trim();
        const filterValue = performanceFilter.value;
        renderStudentList(searchTerm, filterValue);
    };

    window.filterStudents = function() {
        const searchTerm = studentSearchInput.value.trim();
        const filterValue = performanceFilter.value;
        renderStudentList(searchTerm, filterValue);
    };

    // Sidebar toggle function
    window.toggleStudentList = function() {
        const content = document.getElementById('studentListContent');
        const icon = document.getElementById('toggleIcon');
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-right');
        } else {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-down');
        }
    };

    // Event listeners
    studentSearchInput.addEventListener('input', searchStudent);
    performanceFilter.addEventListener('change', filterStudents);

    // Loading and error handling functions
    function showLoading(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = message;
        document.body.appendChild(loadingDiv);
    }

    function hideLoading() {
        const loadingDiv = document.querySelector('.loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Add CSS for new components
    const additionalCSS = `
        <style>
            .cards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: var(--spacing-6);
            }
            
            .student-card {
                background: var(--white);
                border: 1px solid var(--gray-200);
                border-radius: var(--radius-xl);
                overflow: hidden;
                box-shadow: var(--shadow-md);
                transition: all 0.2s ease;
            }
            
            .student-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }
            
            .student-card .card-header {
                padding: var(--spacing-4);
                background: var(--gray-50);
                border-bottom: 1px solid var(--gray-200);
            }
            
            .student-card .card-header h3 {
                margin: 0;
                color: var(--gray-900);
            }
            
            .student-card .card-body {
                padding: var(--spacing-4);
            }
            
            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: var(--spacing-2);
            }
            
            .stat-label {
                color: var(--gray-600);
                font-weight: 500;
            }
            
            .student-card .card-footer {
                padding: var(--spacing-4);
                border-top: 1px solid var(--gray-200);
                background: var(--gray-50);
            }
            
            .heatmap {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
            }
            
            .heatmap-header {
                display: grid;
                grid-template-columns: 100px repeat(6, 1fr);
                gap: var(--spacing-2);
                font-weight: 600;
            }
            
            .heatmap-row {
                display: grid;
                grid-template-columns: 100px repeat(6, 1fr);
                gap: var(--spacing-2);
            }
            
            .heatmap-cell {
                padding: var(--spacing-2);
                text-align: center;
                border-radius: var(--radius-md);
                color: var(--white);
                font-weight: 500;
                font-size: var(--font-size-sm);
            }
            
            .error-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--danger);
                color: var(--white);
                padding: var(--spacing-4);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-lg);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
            }
            
            .welcome-message {
                background: var(--success);
                color: var(--white);
                padding: var(--spacing-4);
                border-radius: var(--radius-lg);
                margin-bottom: var(--spacing-6);
                text-align: center;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', additionalCSS);
}); 