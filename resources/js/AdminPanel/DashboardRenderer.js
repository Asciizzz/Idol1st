import { Widgets } from "./Widgets.js";

export class DashboardRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Dashboard container with ID '${containerId}' not found.`);
        }
    }

    /**
     * Renders the dashboard based on a JSON configuration.
     * @param {Object} jsonConfig 
     */
    render(jsonConfig) {
        if (!this.container) return;

        // Clear existing content
        this.container.innerHTML = '';

        // Update Title if present
        if (jsonConfig.dashboard_title) {
            const titleEl = document.getElementById('dashboard-title');
            if (titleEl) {
                titleEl.textContent = jsonConfig.dashboard_title;
            }
        }

        // Render Widgets
        const layout = jsonConfig.layout || [];
        
        layout.forEach((widgetConfig, index) => {
            let widgetEl = null;

            switch (widgetConfig.type) {
                case 'stat_card':
                    widgetEl = Widgets.createStatCard(widgetConfig.payload);
                    break;
                case 'chart':
                    widgetEl = Widgets.createChart(widgetConfig.payload);
                    break;
                default:
                    console.warn(`Unknown widget type: ${widgetConfig.type}`);
            }

            if (widgetEl) {
                // Apply width class based on config
                if (widgetConfig.width === 'half') {
                    widgetEl.classList.add('widget-half');
                } else if (widgetConfig.width === 'third') {
                    widgetEl.classList.add('widget-third');
                } else {
                    widgetEl.classList.add('widget-full'); // Default to full width
                }

                // Add staggered animation delay
                widgetEl.style.animationDelay = `${index * 0.1}s`;

                this.container.appendChild(widgetEl);
            }
        });
    }
}
