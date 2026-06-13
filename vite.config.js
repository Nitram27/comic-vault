<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="Comic Vault" />
    <meta name="theme-color" content="#0a0a0a" />
    <link rel="apple-touch-icon" href="/icon.png" />
    <title>Comic Vault</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root {
        background: #0a0a0a;
        min-height: 100%;
        min-height: 100dvh;
        width: 100%;
        overflow-x: hidden;
      }
      body { -webkit-font-smoothing: antialiased; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
