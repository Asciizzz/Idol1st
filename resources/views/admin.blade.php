<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenant Dashboard</title>
    <!-- Chart.js for data visualization -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Google Fonts for sleek typography -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    @vite(['resources/css/admin.css', 'resources/js/admin.js'])
</head>
<body>
    <canvas id="bg-canvas"></canvas>
    <div class="admin-wrapper">
        <aside class="sidebar glass-panel">
            <div class="logo">Idol1st Admin</div>
            <ul class="nav-links">
                <li class="active"><a href="#">Dashboard</a></li>
                <li><a href="#">Media Library</a></li>
                <li><a href="#">Site Settings</a></li>
                <li><a href="#">Analytics</a></li>
            </ul>
        </aside>

        <main class="main-content">
            <header class="top-nav glass-panel">
                <h1 id="dashboard-title">Loading...</h1>
                <div class="user-profile">
                    <img src="https://ui-avatars.com/api/?name=Tenant+Admin&background=random" alt="Avatar">
                </div>
            </header>

            <div id="dashboard-container" class="dashboard-grid">
                <!-- Widgets will be injected here by the Data-Driven UI Engine -->
            </div>
        </main>
    </div>

    <form method="POST" action="/logout" style="position:fixed;bottom:10px;left:100px;z-index:99999;">
        @csrf
        <button type="submit">Log out</button>
    </form>
    
</body>
</html>
