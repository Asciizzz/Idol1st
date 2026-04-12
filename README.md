# Idol1st

Custom Laravel project for the Nakurite fanclub homepage.

## Prerequisites

Before setting up this project, ensure you have installed:

- **PHP** (8.2+) - https://www.php.net/downloads
- **Composer** - https://getcomposer.org/download
- **Node.js & npm** - https://nodejs.org/

## Initial Setup (First Time Only)

### 1. Clone the Repository

```powershell
git clone <repository-url>
cd Idol1st
```

### 2. Install PHP Dependencies

```powershell
composer install --no-dev --optimize-autoloader
```

### 3. Create Environment Configuration

Copy the example environment file and generate an encryption key:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

### 4. Set Up Database

Run migrations to create required tables:

```powershell
php artisan migrate:fresh --force
```

### 5. Install Frontend Dependencies

```powershell
npm install
```

### 6. Build Vite Assets

```powershell
npm run build
```

## Running the Project

### Start Development Server

From project root:

```powershell
php artisan serve
```

Then open `http://127.0.0.1:8000` in your browser.

### Development Mode (Auto-rebuild Assets)

In a separate terminal, run:

```powershell
npm run dev
```

This automatically rebuilds CSS/JS when you make changes.

## Frontend Assets

- Blade page: `resources/views/nakuru/index.blade.php`
- Main CSS: `resources/css/index.css`, `resources/css/app.css`
- Public images/fonts/scripts: `public/assets/nakurite/`
- Static animation scripts: `public/assets/nakurite/scripts/`

## Notes

- After pulling changes, run `php artisan migrate` to apply any new database migrations
- If CSS changes don't appear, run `npm run build` and refresh your browser
- External source folder `Nakurite/` is no longer required at runtime
- Detailed editing workflow is in `DEVELOPMENT_GUIDE.md`
