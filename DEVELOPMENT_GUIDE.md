# Idol1st Development Guide

This project has been reset to a clean Laravel starting point.

## Start The Project

Run from the Laravel root:

```powershell
cd C:\Users\Asciiz\Downloads\VSCLMAO\Project\Idol1st
php artisan serve
```

Open http://127.0.0.1:8000.

## Main Files To Edit

- Home route: `routes/web.php`
- Home template: `resources/views/home.blade.php`
- Global styles: `resources/css/app.css`
- Global JS entry: `resources/js/app.js`

## Frontend Build

For local development:

```powershell
npm run dev
```

For production build:

```powershell
npm run build
```

Use this as your base to create the new website structure and pages.
