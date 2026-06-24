import { DashboardRenderer } from "./AdminPanel/DashboardRenderer.js";
import { BgRenderer } from "./AdminPanel/BgRenderer.js";

document.addEventListener('DOMContentLoaded', () => {
    // Mock JSON payload representing SaaS platform metrics
    const mockDashboardData = {
        "dashboard_title": "Idol1st Platform Analytics",
        "layout": [
            {
                "width": "third",
                "type": "stat_card",
                "payload": { "title": "Monthly Recurring Revenue (MRR)", "value": "$12,450", "trend": "+8.4%" }
            },
            {
                "width": "third",
                "type": "stat_card",
                "payload": { "title": "Active Pro Tenants", "value": "415", "trend": "+12" }
            },
            {
                "width": "third",
                "type": "stat_card",
                "payload": { "title": "Churn Rate", "value": "1.2%", "trend": "-0.3%" }
            },
            {
                "width": "full",
                "type": "chart",
                "payload": {
                    "chart_type": "line",
                    "title": "SaaS Revenue Growth (Last 6 Months)",
                    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    "datasets": [
                        { "label": "Revenue ($)", "data": [8500, 9200, 9800, 10500, 11200, 12450] }
                    ]
                }
            },
            {
                "width": "half",
                "type": "chart",
                "payload": {
                    "chart_type": "doughnut",
                    "title": "Tenant Subscriptions by Tier",
                    "labels": ["Free Tier", "Pro ($30/mo)", "Agency ($99/mo)"],
                    "datasets": [
                        { 
                            "label": "Tenants", 
                            "data": [1250, 350, 65],
                            "backgroundColor": [
                                '#94a3b8', // Gray
                                '#8b5cf6', // Purple
                                '#f59e0b'  // Amber
                            ]
                        }
                    ]
                }
            },
            {
                "width": "half",
                "type": "chart",
                "payload": {
                    "chart_type": "bar",
                    "title": "New Signups vs Cancellations",
                    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    "datasets": [
                        { 
                            "label": "New Signups", 
                            "data": [45, 52, 38, 65, 48, 55],
                            "backgroundColor": '#10b981', // Green
                            "borderColor": '#10b981'
                        },
                        { 
                            "label": "Cancellations", 
                            "data": [5, 8, 4, 10, 6, 7],
                            "backgroundColor": '#ef4444', // Red
                            "borderColor": '#ef4444'
                        }
                    ]
                }
            }
        ]
    };

    const renderer = new DashboardRenderer('dashboard-container');
    renderer.render(mockDashboardData);

    // Initialize WebGPU Animated Background
    BgRenderer.init('bg-canvas');
});
