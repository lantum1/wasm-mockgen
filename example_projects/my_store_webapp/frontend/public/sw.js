import * as MystoreserviceModule from './my-store-service/my-store-service.js';

const runFunctionsMap = new Map([
        ['my-store-service', MystoreserviceModule.run]
]);

const rootMappingsModuleNamesMap = new Map([
        ['/my-store/', 'my-store-service']
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
            const waitForServer = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Server initialization timeout')), 15000);
                const interval = setInterval(() => {
                    if (self.isServerReady) {
                        clearTimeout(timeout);
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });

            waitForServer
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
            const handler = await run();
            handlersMap.set(moduleName, handler);
        } catch (error) {
            console.error(`Не удалось загрузить модуль ${moduleName}:`, error);
        }
    }
    self.isServerReady = true;
}

const queryParams = new URL(self.location.href).searchParams;
const modulesToLoad = queryParams.getAll('module');

(async () => {
    await loadModules(modulesToLoad);
})();

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    for (const [path, moduleName] of rootMappingsModuleNamesMap.entries()) {
        if (url.pathname.startsWith(path)) {
            const handler = handlersMap.get(moduleName);
            if (handler) {
                event.respondWith((async () => {
                    const response = await handler(event.request);

                    const allSetCookies = [...response.headers.entries()]
                        .filter(([name]) => name.toLowerCase() === 'x-set-cookie')
                        .map(([, value]) => value);

                    if (allSetCookies.length > 0) {
                        const clients = await self.clients.matchAll();
                        for (const client of clients) {
                            for (const cookie of allSetCookies) {
                                client.postMessage({
                                    type: 'SET_COOKIE',
                                    value: cookie
                                });
                            }
                        }
                    }

                    return response;
                })());
            }
            return;
        }
    }
});
