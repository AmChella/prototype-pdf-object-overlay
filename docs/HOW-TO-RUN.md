# 🚀 How to Run the Application

You now have **two versions** of the UI. Here's how to run each:

---

## 🆕 React UI (New - Recommended)

### Option 1: From Main Directory

```bash
# From project root
npm run dev:react
```

### Option 2: From ui-react Directory

```bash
cd ui-react
npm run dev
```

**Opens:** `http://localhost:3000` (or another port if 3000 is busy)

**Features:**
- ✅ Hot reload (changes update instantly)
- ✅ Modern React components
- ✅ Better developer experience
- ✅ Production build ready

---

## 📜 Original Vanilla JS UI (Old)

### Run Original UI

```bash
# From project root
npm run dev
```

**Opens:** `http://localhost:8000`

**Features:**
- ✅ Original vanilla JavaScript UI
- ✅ Works with existing PDFs
- ✅ Stable and tested

---

## 🔧 Backend Server

The backend server runs **independently** from the UI:

```bash
# Start backend server
npm run server

# Or use the combined dev server (vanilla UI)
npm run dev:server
```

**Server runs on:** `ws://localhost:8081`

---

## 📊 Quick Reference

| Command | What it does | Port |
|---------|-------------|------|
| `npm run dev:react` | **React UI** (new) | 3000 |
| `npm run dev` | Vanilla UI (old) | 8000 |
| `npm run server` | Backend only | 8081 |
| `npm run build:react` | Build React for production | - |

---

## 🐛 Troubleshooting

### Issue: 404 Error on `npm run dev`

**Solution:** That's the old vanilla UI trying to run. Use `npm run dev:react` instead for the React version.

### Issue: Port already in use

**Solution:** 
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
cd ui-react
npm run dev -- --port 3001
```

### Issue: React dependencies not found

**Solution:**
```bash
cd ui-react
npm install
```

### Issue: Vite not starting

**Solution:**
Check that you're in the `ui-react` folder and have run `npm install` there.

---

## 🎯 Recommended Workflow

### For Development:

1. **Start Backend:**
   ```bash
   npm run server
   ```

2. **Start React UI (in new terminal):**
   ```bash
   npm run dev:react
   ```

3. **Open Browser:**
   - React UI: `http://localhost:3000`
   - Backend WebSocket: `ws://localhost:8081`

### For Production:

```bash
# Build React UI
npm run build:react

# Output will be in ui-react/dist/
# Deploy those files to your server
```

---

## 📝 Notes

- **Both UIs work** with the same backend server
- **React UI** is the new version with better architecture
- **Vanilla UI** is the original, still functional
- You can **run both** simultaneously on different ports
- The backend server **doesn't need changes** for either UI

---

## 🎉 Success!

If you see this in your terminal:

```
  VITE v4.4.9  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**You're ready to go!** 🚀

Open `http://localhost:3000` in your browser.

---

## 💡 Pro Tips

- Use `npm run dev:react` from the **main project directory**
- The React UI has **hot reload** - changes update instantly
- Press `q` in terminal to stop the dev server
- Press `r` to restart the dev server
- Check `ui-react/QUICK-START.md` for more details

Happy coding! 💻✨

