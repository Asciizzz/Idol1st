export class Widgets {
    /**
     * Creates a Stat Card widget
     * @param {Object} payload 
     * @returns {HTMLElement}
     */
    static createStatCard(payload) {
        const el = document.createElement('div');
        el.className = 'glass-panel widget';
        
        const title = document.createElement('div');
        title.className = 'stat-card-title';
        title.textContent = payload.title || 'Unknown Metric';

        const value = document.createElement('div');
        value.className = 'stat-card-value';
        value.textContent = payload.value || '0';

        el.appendChild(title);
        el.appendChild(value);

        if (payload.trend) {
            const trend = document.createElement('div');
            const isUp = payload.trend.startsWith('+');
            trend.className = `stat-card-trend ${isUp ? 'trend-up' : 'trend-down'}`;
            trend.textContent = payload.trend;
            el.appendChild(trend);
        }

        return el;
    }

    /**
     * Creates a Chart Widget
     * @param {Object} payload 
     * @returns {HTMLElement}
     */
    static createChart(payload) {
        const el = document.createElement('div');
        el.className = 'glass-panel widget';

        const title = document.createElement('div');
        title.className = 'chart-widget-title';
        title.textContent = payload.title || 'Chart';
        el.appendChild(title);

        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'chart-container';
        
        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(canvas);
        el.appendChild(canvasContainer);

        // We use setTimeout to ensure the canvas is in the DOM before Chart.js initializes it
        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            
            // Chart.js global defaults for dark mode aesthetics
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.font.family = "'Outfit', sans-serif";
            
            new Chart(ctx, {
                type: payload.chart_type || 'line',
                data: {
                    labels: payload.labels || [],
                    datasets: payload.datasets.map(ds => ({
                        ...ds,
                        backgroundColor: ds.backgroundColor || 'rgba(139, 92, 246, 0.2)',
                        borderColor: ds.borderColor || '#8b5cf6',
                        borderWidth: 2,
                        tension: 0.4, // Smooth curves for line charts
                        fill: true
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: payload.datasets.length > 1,
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }, 0);

        return el;
    }
}
