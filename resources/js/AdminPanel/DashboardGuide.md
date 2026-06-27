# Admin Panel Dashboard Configuration Guide

The Admin Panel Dashboard is driven entirely by a JSON configuration object. By passing a specifically structured JSON object to the `DashboardRenderer.render(jsonConfig)` method, you can dynamically build out metric cards and complex charts. 

The background WebGPU aesthetic is handled automatically by the environment and requires no configuration here.

## Core Structure

The main configuration object requires two primary fields:

```json
{
  "dashboard_title": "Idol1st Overview",
  "layout": [
    // Array of Widget Objects
  ]
}
```

- **`dashboard_title`** (String): Updates the main header text of the dashboard view.
- **`layout`** (Array): A sequential list of widgets to display. They will render in order with staggered entry animations.

---

## Widget Objects

Every widget in the `layout` array follows a standard base structure:

```json
{
  "type": "...",
  "width": "...",
  "payload": { ... }
}
```

- **`type`**: Determines the kind of widget. Currently supports `"stat_card"` and `"chart"`.
- **`width`**: Defines how much horizontal space the widget takes up. 
  - `"full"` (100% width, default)
  - `"half"` (50% width)
  - `"third"` (33.3% width)
- **`payload`**: The data specifically tailored to the widget type.

---

## 1. Stat Card Widget

Stat cards are used for displaying single, vital metrics (e.g., Total Pro Subscribers, Monthly Earnings). Keep in mind that for Idol1st, the primary metric you care about is SaaS subscription revenue from Tenants, not their personal merch or subscriber stats.

**Type:** `"stat_card"`

**Payload Structure:**
- `title` (String): The label for the metric (e.g., "Monthly SaaS Earnings").
- `value` (String | Number): The primary metric value (e.g., "$12,450").
- `trend` (String, Optional): A trend indicator. If the string starts with `+`, it will be styled positively (green). Otherwise, it will be styled negatively (red).

**Example:**
```json
{
  "type": "stat_card",
  "width": "third",
  "payload": {
    "title": "Monthly SaaS Earnings",
    "value": "$45,200",
    "trend": "+12.5% this month"
  }
}
```

---

## 2. Chart Widget

Chart widgets utilize Chart.js to render interactive graphs. They automatically inherit dark-mode aesthetics to match the Vtuber vibe.

**Type:** `"chart"`

**Payload Structure:**
- `title` (String): The title of the chart box.
- `chart_type` (String, Optional): Maps directly to Chart.js types (e.g., `"line"`, `"bar"`, `"doughnut"`, `"pie"`). Defaults to `"line"`.
- `labels` (Array of Strings): The X-axis labels (e.g., `["Jan", "Feb", "Mar"]`).
- `datasets` (Array of Objects): The actual data lines/bars to plot.
  - `label` (String): Name of the dataset (appears in tooltips and legends).
  - `data` (Array of Numbers): The Y-axis values matching the `labels` array.
  - `backgroundColor` (String, Optional): The fill color. Defaults to a semi-transparent purple.
  - `borderColor` (String, Optional): The line/border color. Defaults to solid purple.

**Example:**
```json
{
  "type": "chart",
  "width": "full",
  "payload": {
    "title": "Tenant Pro Subscription Growth",
    "chart_type": "line",
    "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
    "datasets": [
      {
        "label": "New Pro Tenants",
        "data": [12, 19, 30, 45],
        "backgroundColor": "rgba(139, 92, 246, 0.2)",
        "borderColor": "#8b5cf6"
      },
      {
        "label": "Cancellations",
        "data": [2, 3, 1, 4],
        "backgroundColor": "rgba(239, 68, 68, 0.2)",
        "borderColor": "#ef4444"
      }
    ]
  }
}
```

---

## Putting it Together

To render a dashboard, import the renderer and pass the JSON config:

```javascript
import { DashboardRenderer } from './DashboardRenderer.js';

// Requires a container div in your HTML
const renderer = new DashboardRenderer('dashboard-container-id');

renderer.render({
  "dashboard_title": "Tenant & Subscription Metrics",
  "layout": [
    {
      "type": "stat_card",
      "width": "half",
      "payload": { "title": "Total Tenants", "value": "1,204", "trend": "+42" }
    },
    {
      "type": "stat_card",
      "width": "half",
      "payload": { "title": "Pro Tier Ratio", "value": "68%", "trend": "+2%" }
    },
    {
      "type": "chart",
      "width": "full",
      "payload": {
        "title": "Revenue vs Pro Upgrades",
        "chart_type": "bar",
        "labels": ["Q1", "Q2", "Q3", "Q4"],
        "datasets": [
          { "label": "Revenue", "data": [10000, 20000, 15000, 30000] }
        ]
      }
    }
  ]
});
```
