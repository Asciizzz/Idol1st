# Agent Rules and Project Guidelines

## Virtual Site Builder Design Philosophy
- **Local Until Global (Asset Handling):** When a user adds or selects an asset (image, audio, etc.) in the editor, do NOT immediately upload it to the server. Instead, use local URLs (e.g., `URL.createObjectURL(file)`) to display it. The actual file upload and storage process to the backend server must ONLY happen in batch when the user explicitly saves the project. This prevents unused or abandoned file uploads from bloating the server's storage.
