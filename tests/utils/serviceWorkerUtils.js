/**
 * Инициализирует Service Worker для тестового окружения и ожидает завершения его полной регистрации.
 *
 * @param {Object} options Объект с параметрами для настройки Service Worker.
 * @param {import('puppeteer').Page} options.page Экземпляр страницы Puppeteer, на которой будет зарегистрирован Service Worker.
 * @param {string} options.workerFile Путь к файлу Service Worker, например, '/sw.js'.
 * @param {string} options.scope Область (scope) Service Worker, например, '/api-python'.
 * @param {string[]} [options.modulesNames=[]] Массив имен модулей, которые нужно передать как query параметры в `workerFile`.
 *                      Эти модули будут переданы в URL, например, ['api-python', 'api'] превратится в
 *                      '/sw.js?module=api-python&module=api'.
 * @param {number} [options.port=8081] Порт локального тестового сервера, по умолчанию `8081`.
 *
 * @throws {Error} Если инициализация Service Worker занимает больше 15 секунд, выбрасывается ошибка с сообщением о тайм-ауте.
 *
 * @example
 * await setupServiceWorker({
 *     page,
 *     workerFile: '/sw.js',
 *     scope: '/',
 *     modulesNames: ['api-python', 'api'],
 *     port: 8081
 * });
 */

export async function setupServiceWorker({ page, workerFile, scope, modulesNames = [], port = 8081 }) {
    const queryParams = modulesNames.map((module) => `module=${encodeURIComponent(module)}`).join('&');
    const workerFileWithModules = `${workerFile}?${queryParams}`;

    const swScopePath = `http://localhost:${port}${scope}`;
    await page.goto(swScopePath);

    await page.evaluate((workerFileWithModules, scope) => {
        return navigator.serviceWorker.register(workerFileWithModules, { scope, type: 'module' });
    }, workerFileWithModules, scope);

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

/**
 * Дерегистрирует Service Worker для заданной страницы и обновляет её.
 *
 * @param {Object} options Объект с параметрами для деактивации Service Worker.
 * @param {import('puppeteer').Page} options.page Экземпляр страницы Puppeteer.
 * @param {string} options.scope Область (scope) Service Worker, например, '/api-python'.
 * @param {number} [options.port=8081] Порт локального тестового сервера, по умолчанию `8081`.
 *
 * @throws {Error} Если Service Worker не найден в заданной области.
 *
 * @example
 * // Пример использования deregisterServiceWorker
 * await deregisterServiceWorker({
 *     page,
 *     scope: '/api-python',
 *     port: 8081
 * });
 */
export async function deregisterServiceWorker({ page, scope, port = 8081 }) {
    const swScopePath = `http://localhost:${port}${scope}`;

    await page.goto(swScopePath);
    
    const unregistered = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            return registration.unregister();
        }
        return false;
    });

    if (!unregistered) {
        throw new Error(`Service Worker не найден в области: ${swScopePath}`);
    }

    await page.reload();
}

