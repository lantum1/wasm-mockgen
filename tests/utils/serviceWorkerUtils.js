/**
 * Универсальная функция для запуска сервера и регистрации Service Worker
 * @param {Object} config - Конфигурация
 * @param {Object} config.page - Объект страницы, в которой будет проинициализирован Service Worker
 * @param {string} config.workerFile - Путь к файлу Service Worker
 * @param {string} config.scope - Скоуп для регистрации Service Worker
 * @param {number} config.port - Порт для запуска сервера (по умолчанию 8080)
 */
export async function setupServiceWorker({ page, workerFile, scope, port = 8081 }) {
    const testPath = `http://localhost:${port}${scope}`;
    await page.goto(testPath);
    await page.evaluate((workerFile, scope) => {
        return navigator.serviceWorker.register(workerFile, { scope , type: 'module'});
    }, workerFile, scope);

    const uniqueId = crypto.randomUUID();
    await page.evaluate((uniqueId) => {
        return navigator.serviceWorker.ready.then((registration) => {
            registration.active.postMessage({ type: 'SET_UUID', uuid: uniqueId });
        });
    }, uniqueId);

    await page.evaluate((uniqueId) => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Service Worker initialization timed out')), 15000);

            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'SERVICE_WORKER_READY' && event.data?.id === uniqueId) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });
    }, uniqueId);
}
