# Plain Sudoku

A minimal Sudoku game that runs in the browser. No build step, no dependencies.

- Easy, Medium and Hard puzzles, each with exactly one solution
- Pencil notes, hints, undo and erase
- Wrong numbers are marked in red, with a mistake and hint counter
- Timer and best time per level (saved in your browser)
- Light and dark mode that follow your device
- Works on phones and desktop, with keyboard controls

## Controls

| Action | Key |
| --- | --- |
| Fill a cell | `1`–`9` |
| Move | Arrow keys |
| Erase | `Backspace` / `Delete` |
| Toggle notes | `N` |
| Hint | `H` |
| Undo | `Ctrl+Z` / `Cmd+Z` |

## Run it locally

Open `index.html` in a browser. That is all.

Or serve it from a folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages (free)

1. Create a new repository on GitHub, for example `plain-sudoku` (public).
2. Upload `index.html`, `style.css`, `script.js` and `README.md` to the repository root.
   Or push from your computer:
   ```bash
   cd plain-sudoku
   git init
   git add .
   git commit -m "Add Plain Sudoku"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/plain-sudoku.git
   git push -u origin main
   ```
3. On GitHub open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose branch **main** and folder **/ (root)**, then click **Save**.
6. Wait one to two minutes. Your game is live at
   `https://YOUR-USERNAME.github.io/plain-sudoku/`

Every time you push a change to `main`, the site updates by itself.

## Other free hosts

- **Netlify:** drag the project folder onto app.netlify.com/drop.
- **Vercel or Cloudflare Pages:** import the GitHub repository and deploy with no build command and the root as the output folder.

## Files

- `index.html` – page structure
- `style.css` – layout and light/dark themes
- `script.js` – puzzle generator, solver and game logic

Fonts (Instrument Sans and Instrument Serif) load from Google Fonts. If they are blocked, the game falls back to system fonts.
