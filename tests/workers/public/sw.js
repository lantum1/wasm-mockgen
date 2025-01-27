import * as ApiModule from './api/api.js';
import * as ApiPythonModule from './api-python/api-python.js';

const runFunctionsMap = new Map([
    ['api', ApiModule.run],
    ['api-python', ApiPythonModule.run]
]);

const rootMappingsModuleNamesMap = new Map([
    ['/api/', "api"],
    ['/api-python/', "api-python"]
]);

self.isServerReady = false;
self.uuid = null;

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'SET_UUID') {
        self.uuid = event.data.uuid;
        console.log(`Received UUID: ${self.uuid}`);
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        self.clients.claim().then(() => {
            const waitForGoServer = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Server initialization timeout')), 15000);
                const interval = setInterval(() => {
                    if (self.isServerReady) {
                        clearTimeout(timeout);
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });

            waitForGoServer
                .then(() => {
                    console.log('Server is ready');
                    return self.clients.matchAll();
                })
                .then((clients) => {
                    const uniqueId = self.uuid || 'default';
                    clients.forEach((client) => {
                        client.postMessage({ type: 'SERVICE_WORKER_READY', id: uniqueId });
                    });
                })
                .catch((error) => {
                    console.error('Failed to notify clients:', error);
                });
        })
    );
});

const handlersMap = new Map();

async function loadModules(modules) {
    for (const moduleName of modules) {
        const run = runFunctionsMap.get(moduleName);

        if (!run) {
            console.warn(`Модуль ${moduleName} не найден!`);
            continue;
        }
        try {
            const handler = await run(); // Ожидаем завершения функции run для каждого модуля
            handlersMap.set(moduleName, handler);
        } catch (error) {
            console.error(`Не удалось загрузить модуль ${moduleName}:`, error);
        }
    }
    self.isServerReady = true;
}

const queryParams = new URL(self.location.href).searchParams;
const modulesToLoad = queryParams.getAll('module');

// Ожидаем завершения загрузки модулей перед выполнением следующего кода
(async () => {
    await loadModules(modulesToLoad);
})();

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    for (const [path, moduleName] of rootMappingsModuleNamesMap.entries()) {
        if (url.pathname.startsWith(path)) {
            const handler = handlersMap.get(moduleName);
            if (handler) {
                event.respondWith(handler(event.request));
            }
            return;
        }
    }
});
