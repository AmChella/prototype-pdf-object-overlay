# Figure Placement Feature - README

## 📖 Documentation

All figure placement documentation has been consolidated into one comprehensive guide:

**→ [FIGURE-PLACEMENT-COMPLETE-GUIDE.md](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md)**

## 🚀 Quick Links

Jump directly to specific sections:

- **[Quick Start (5 steps)](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#2-quick-start-guide)** - Get started immediately
- **[Troubleshooting](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#9-troubleshooting)** - Fix common issues
- **[Configuration Reference](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#5-configuration-reference)** - All config options
- **[LaTeX Explanation](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#4-understanding-latex-two-column-placement)** - Why "left column" doesn't work
- **[Examples](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#8-usage-examples)** - Real-world usage

## 📋 Table of Contents

The complete guide includes:

1. **Overview** - What the feature does and available options
2. **Quick Start Guide** - 5-step tutorial to get started
3. **Feature Implementation Details** - Complete workflow explanation
4. **Understanding LaTeX Two-Column Placement** - Why placement works the way it does
5. **Configuration Reference** - Complete server-config.json documentation
6. **System Architecture** - Component overview and data flow
7. **Template Integration** - How templates use placement attributes
8. **Usage Examples** - Step-by-step examples with XML, LaTeX, and results
9. **Troubleshooting** - Solutions to common issues
10. **Advanced Topics** - Custom placement, spanning columns, float barriers
11. **Future Enhancements** - Planned features
12. **Appendix** - Reference materials, glossary, commands

## ⚡ Ultra-Quick Start

```bash
# 1. Start system
cd server && node server.js    # Terminal 1
cd ui-react && npm run dev      # Terminal 2

# 2. Open browser
open http://localhost:5173

# 3. Use feature
# - Generate document
# - Click figure
# - Select: Move Bottom / Move Top / Place Here
# - Click "Send Instruction"
```

## ✅ Validation

Check that everything is configured correctly:

```bash
node scripts/validate-figure-placement.js
```

Expected: `✓ All validations passed! (20/20 checks)`

## 📌 Available Options

| Option | LaTeX | Effect |
|--------|-------|--------|
| Move Bottom | `[b]` | Bottom of column |
| Move Top | `[t]` | Top of column |
| Place Here | `[!h]` | Current position in flow |

## ⚠️ Important Note

**"Left column" placement doesn't exist in LaTeX.** Column placement is determined by where the figure appears in the XML source order, not by absolute position. The "Place Here" option places the figure at its current position in the document flow, which may be in either column depending on the source order.

See [Section 4: Understanding LaTeX Two-Column Placement](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#4-understanding-latex-two-column-placement) for full explanation.

## 🔧 Files Modified

- `server/config/server-config.json` - Configuration
- `docs/FIGURE-PLACEMENT-COMPLETE-GUIDE.md` - This comprehensive documentation
- `scripts/validate-figure-placement.js` - Validation tool

No code changes were required - the existing system already supported this feature!

## 📊 Status

- ✅ Implemented and tested
- ✅ Configuration validated
- ✅ Documentation complete
- ✅ Production ready

## 🆘 Need Help?

1. **Read the full guide**: [FIGURE-PLACEMENT-COMPLETE-GUIDE.md](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md)
2. **Check troubleshooting**: [Section 9](./FIGURE-PLACEMENT-COMPLETE-GUIDE.md#9-troubleshooting)
3. **Run validation**: `node scripts/validate-figure-placement.js`
4. **Check server logs**: Look for errors in terminal where server is running
5. **Check browser console**: Press F12 and check for errors

---

**Last Updated**: November 3, 2025  
**Version**: 1.0.1  
**Status**: ✅ Complete

