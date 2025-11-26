# FlowCraft Frontend

Client side application built with HTML5, JavaScript, jQuery, and Bootstrap 4.

## Setup

1. Install a static file server:
   ```
   npm install http-server -g
   ```

2. From this directory, run:
   ```
   http-server
   ```

3. Open `http://localhost:8080` in your browser.

## Configuration

The backend API URL is set in `js/dependency.js` inside the `getHostUrl()` function. Update this if your backend runs on a different host or port.

## Testing

Tests use Jest:
```
npm install
npm test
```