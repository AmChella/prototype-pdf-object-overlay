# Feature Flags Configuration

## Overview

Feature flags are now managed by the server configuration file, providing centralized control over application features.

## Server Configuration

### Location
`server/config/server-config.json`

### Format
```json
{
  "featureFlags": {
    "enableInstructionStack": true,
    "enableVersioning": true
  },
  ...
}
```

### Available Flags

| Flag | Description | Default |
|------|-------------|---------|
| `enableInstructionStack` | Enable batch mode for instructions | `true` |
| `enableVersioning` | Enable document version history tracking | `true` |

## API Endpoints

### Get Feature Flags
```
GET /api/feature-flags
```

**Response:**
```json
{
  "enableInstructionStack": true,
  "enableVersioning": true
}
```

## WebSocket Integration

When a client connects via WebSocket, the server automatically sends the initial configuration including feature flags:

```json
{
  "type": "config",
  "data": {
    "dropdownOptions": {...},
    "featureFlags": {
      "enableInstructionStack": true,
      "enableVersioning": true
    }
  }
}
```

## UI Implementation

### React UI

Feature flags are:
1. Loaded from server on WebSocket connection (see `App.jsx` `onConfig` handler)
2. Stored in `AppContext` state
3. Displayed as **read-only** checkboxes in the Sidebar
4. Cannot be toggled from the UI

### How to Change Feature Flags

1. **Edit the server config:**
   ```bash
   vi server/config/server-config.json
   ```

2. **Update the flags:**
   ```json
   "featureFlags": {
     "enableInstructionStack": false,  // Disable batch mode
     "enableVersioning": true
   }
   ```

3. **Restart the server:**
   ```bash
   npm run server
   ```

4. **Refresh the UI** - Feature flags will be loaded automatically

## Benefits

✅ **Centralized Control**: Manage features from one config file  
✅ **Consistency**: All clients get the same feature flags  
✅ **No Manual Sync**: Flags are pushed to clients on connection  
✅ **Environment-Specific**: Different configs for dev/prod  
✅ **Server Authority**: UI cannot override server settings

## Files Modified

### Server-Side
- `server/config/server-config.json` - Added `featureFlags` section
- `server/modules/ConfigManager.js` - Added methods to get feature flags
- `server/server.js` - Added `/api/feature-flags` endpoint and WebSocket integration

### Client-Side (React UI)
- `ui-react/src/App.jsx` - Updated `onConfig` handler to load feature flags
- `ui-react/src/context/AppContext.jsx` - Removed localStorage, added setters to exports
- `ui-react/src/components/Sidebar/Sidebar.jsx` - Made checkboxes read-only with help text

## Migration Notes

- **Removed**: localStorage persistence of feature flags
- **Removed**: UI toggle functionality (now server-controlled)
- **Added**: Server-side feature flag management
- **Added**: Automatic loading from server on connection

