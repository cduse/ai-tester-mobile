/**
 * Local HTTP server — lets the Chrome extension pull contexts from the phone
 * over the local network.
 *
 * Routes:
 *   GET /status    — health check
 *   GET /contexts  — all contexts
 *   GET /products  — all products
 *   GET /scenarios — all scenarios
 *   GET /all       — everything in one payload
 */
import TcpSocket from 'react-native-tcp-socket';
import { getContexts, getProducts, getScenarios } from './storage';

export const SERVER_PORT = 3456;
let serverInstance = null;

function send(socket, statusCode, data) {
  const body = JSON.stringify(data);
  const statusText = { 200: 'OK', 404: 'Not Found', 405: 'Method Not Allowed', 500: 'Internal Server Error' }[statusCode] || 'Error';
  const response = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    'Content-Type: application/json; charset=utf-8',
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Methods: GET, OPTIONS',
    'Access-Control-Allow-Headers: Content-Type, Authorization',
    `Content-Length: ${body.length}`,
    'Connection: close',
    '',
    body,
  ].join('\r\n');

  try { socket.write(response, 'utf8'); } catch (_) {}
  setTimeout(() => { try { socket.destroy(); } catch (_) {} }, 50);
}

export function startServer(onEvent) {
  if (serverInstance) return;

  const server = TcpSocket.createServer(async (socket) => {
    let buffer = '';

    socket.on('data', async (chunk) => {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (!buffer.includes('\r\n\r\n')) return; // wait for full headers

      const firstLine = buffer.split('\r\n')[0] || '';
      const [method, rawPath] = firstLine.split(' ');
      const path = (rawPath || '/').split('?')[0];

      if (method === 'OPTIONS') { send(socket, 200, {}); return; }
      if (method !== 'GET')     { send(socket, 405, { error: 'Method not allowed' }); return; }

      try {
        switch (path) {
          case '/status':
            send(socket, 200, { ok: true, app: 'AI Tester Mobile', version: '1.0.0' });
            break;
          case '/contexts':
            send(socket, 200, { contexts: await getContexts() });
            break;
          case '/products':
            send(socket, 200, { products: await getProducts() });
            break;
          case '/scenarios':
            send(socket, 200, { scenarios: await getScenarios() });
            break;
          case '/all': {
            const [contexts, products, scenarios] = await Promise.all([
              getContexts(), getProducts(), getScenarios(),
            ]);
            send(socket, 200, { contexts, products, scenarios });
            break;
          }
          default:
            send(socket, 404, { error: 'Not found' });
        }
      } catch (err) {
        send(socket, 500, { error: 'Internal error' });
      }
    });

    socket.on('error', () => { try { socket.destroy(); } catch (_) {} });
  });

  server.listen({ port: SERVER_PORT, host: '0.0.0.0' }, () => {
    serverInstance = server;
    onEvent?.({ type: 'started', port: SERVER_PORT });
  });

  server.on('error', (err) => {
    serverInstance = null;
    onEvent?.({ type: 'error', error: err?.message || 'Unknown error' });
  });

  server.on('close', () => {
    serverInstance = null;
    onEvent?.({ type: 'stopped' });
  });
}

export function stopServer() {
  if (serverInstance) {
    try { serverInstance.close(); } catch (_) {}
    serverInstance = null;
  }
}

export function isServerRunning() {
  return serverInstance !== null;
}
