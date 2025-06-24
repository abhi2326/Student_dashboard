document.addEventListener('DOMContentLoaded', function () {
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
            console.log(response);
            
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
            console.log(response);
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


            <div class = "hamari_table">
                <table id="subjectPerformanceTable" class="subject-performance-table">
                    <!-- Populated by JS -->
                </table>
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
                <div style="height: 300px; width: 100%; max-width: 600px;">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>
        `;

        // Render the performance growth chart (hyperbolic style)
        renderPerformanceGrowthChart(performanceData);
        // Add this inside the existing studentDashboard.innerHTML template string,
// just AFTER the ".progress-section" section and BEFORE renderPerformanceGrowthChart()

const subjectPerformanceTable = document.getElementById('subjectPerformanceTable');
if (performanceData && typeof performanceData === 'object') {
    console.log(student);
    
    let tableHTML = `
        <thead>
            <tr>
                <th>Subject</th>
                <th>Score</th>
            </tr>
        </thead>
        <tbody>
    `;

    const subjects = ['EDA', 'ML', 'Power BI', 'Python', 'SQL', 'Spreadsheet'];

    subjects.forEach(subject => {
        const score = performanceData[subject] ?? 0;
        tableHTML += `
            <tr>
                <td>${subject}</td>
                <td>${score}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody>`;
    subjectPerformanceTable.innerHTML = tableHTML;
}

    }

    function make_table(){

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

    // Render a hyperbolic growth chart showing all task modules together
    function renderPerformanceGrowthChart(performanceData) {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) {
            console.error('Performance chart canvas not found');
            return;
        }

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            const container = document.getElementById('performanceChartContainer');
            if (container) {
                container.innerHTML = `
                    <h3 style="margin-bottom:1rem;"><i class="fas fa-chart-line"></i> All Modules Growth Chart</h3>
                    <div class="error-message" style="padding: 2rem; text-align: center; background: #f8f9fa; border-radius: 8px;">
                        <i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                        Chart library is loading. Please refresh the page if this message persists.
                    </div>
                `;
            }
            return;
        }

        try {
            // Define all task modules we want to display
            const taskModules = ['Spreadsheet', 'SQL', 'Power BI', 'Python', 'EDA', 'ML'];

            // Colors for each module (different colors for visual distinction)
            const moduleColors = {
                'Spreadsheet': { border: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                'SQL': { border: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                'Power BI': { border: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                'Python': { border: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                'EDA': { border: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                'ML': { border: '#06b6d4', bg: 'rgba(6,182,212,0.1)' }
            };

            // Create datasets for each module with hyperbolic growth curves
            const datasets = [];
            const timePoints = 8; // Number of time points to show progression
            const labels = Array.from({ length: timePoints }, (_, i) => `Stage ${i + 1}`);

            taskModules.forEach(module => {
                const actualScore = performanceData && performanceData[module]
                    ? parseFloat(performanceData[module]) : 0;

                // Generate hyperbolic growth curve for this module
                // Formula: y = a * (1 - e^(-bx)) where 'a' is the asymptote (target score)
                // We'll use the actual score as the final target, with some reasonable progression
                const targetScore = Math.max(actualScore, 20); // Minimum 20 for visualization
                const growthData = [];

                for (let i = 0; i < timePoints; i++) {
                    // Hyperbolic growth: starts slow, accelerates, then levels off
                    const x = (i + 1) / timePoints; // Normalize to 0-1
                    const growthFactor = 1 - Math.exp(-3 * x); // Hyperbolic curve
                    const score = Math.round(targetScore * growthFactor);
                    growthData.push(Math.min(score, 100));
                }

                // Ensure the last point matches the actual score if available
                if (actualScore > 0) {
                    growthData[timePoints - 1] = actualScore;
                }

                datasets.push({
                    label: module,
                    data: growthData,
                    fill: false,
                    borderColor: moduleColors[module].border,
                    backgroundColor: moduleColors[module].bg,
                    tension: 0.4, // Smooth curves
                    pointBackgroundColor: moduleColors[module].border,
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    pointBorderWidth: 2
                });
            });

            // Destroy existing chart if it exists
            if (window.performanceChart && typeof window.performanceChart.destroy === 'function') {
                window.performanceChart.destroy();
            }

            // Create new chart with all modules
            window.performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 10
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                    size: 12,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            cornerRadius: 6,
                            multiKeyBackground: 'transparent',
                            callbacks: {
                                title: function (context) {
                                    return `Progress: ${context[0].label}`;
                                },
                                label: function (context) {
                                    return `${context.dataset.label}: ${context.parsed.y}%`;
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
                                text: 'Proficiency Score (%)',
                                color: '#374151',
                                font: { size: 14, weight: '600' }
                            },
                            ticks: {
                                color: '#6b7280',
                                font: { size: 12 },
                                callback: function (value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.05)',
                                drawBorder: false
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Learning Progression',
                                color: '#374151',
                                font: { size: 14, weight: '600' }
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
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });

            console.log('All modules hyperbolic growth chart rendered successfully');

        } catch (error) {
            console.error('Error rendering performance chart:', error);
            const container = document.getElementById('performanceChartContainer');
            if (container) {
                container.innerHTML = `
                    <h3 style="margin-bottom:1rem;"><i class="fas fa-chart-line"></i> All Modules Growth Chart</h3>
                    <div class="error-message" style="padding: 2rem; text-align: center; background: #fee2e2; border-radius: 8px; color: #dc2626;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                        Unable to load performance chart. Please try refreshing the page.
                    </div>
                `;
            }
        }
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
    window.showIndividualView = function () {
        currentView = 'individual';
        updateNavigation();

        document.querySelectorAll('.dashboard-view').forEach(view => view.classList.remove('active'));
        document.getElementById('individualDashboard').classList.add('active');

        // Removed automatic call to displayStudentDashboard to prevent infinite loop
        // The dashboard will be displayed when a student is explicitly clicked
    };

    window.showComprehensiveView = function () {
        currentView = 'comprehensive';
        updateNavigation();

        document.querySelectorAll('.dashboard-view').forEach(view => view.classList.remove('active'));
        document.getElementById('comprehensiveDashboard').classList.add('active');

        loadComprehensiveDashboard();
    };

    window.showAnalyticsView = function () {
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
    window.switchView = function (view) {
        currentComprehensiveView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.view-btn').classList.add('active');
        renderComprehensiveContent();
    };

    // Search and filter functions
    window.searchStudent = function () {
        const searchTerm = studentSearchInput.value.trim();
        const filterValue = performanceFilter.value;
        renderStudentList(searchTerm, filterValue);
    };

    window.filterStudents = function () {
        const searchTerm = studentSearchInput.value.trim();
        const filterValue = performanceFilter.value;
        renderStudentList(searchTerm, filterValue);
    };

    // Sidebar toggle function
    window.toggleStudentList = function () {
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
