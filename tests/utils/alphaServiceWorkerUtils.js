const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

/**
 * Универсальная функция для запуска сервера и регистрации Service Worker
 * @param {Object} config - Конфигурация
 * @param {string} config.workerFile - Путь к файлу Service Worker
 * @param {string} config.scope - Скоуп для регистрации Service Worker
 * @param {number} config.port - Порт для запуска сервера (по умолчанию 8080)
 */
async function setupServiceWorker({ workerFile, scope, port = 8080 }) {
    const serverPath = path.join(__dirname, '../tests/workers');
    const serverProcess = spawn('npx', ['http-server', serverPath, '-p', port], {
        stdio: 'inherit',
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const uniqueId = crypto.randomUUID();
    const testPath = `http://localhost:${port}${scope}`;

    await page.goto(testPath);
    await page.evaluate((workerFile, scope) => {
        return navigator.serviceWorker.register(workerFile, { scope });
    }, workerFile, scope);
    
    await page.evaluate((uniqueId) => {
        return navigator.serviceWorker.ready.then((registration) => {
            registration.active.postMessage({ type: 'SET_UUID', uniqueId });
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

    return { browser, page, serverProcess };
}

async function teardownServiceWorker({ browser, serverProcess }) {
    if (browser) {
        await browser.close();
    }
    if (serverProcess) {
        serverProcess.kill();
    }
}

module.exports = {
    setupServiceWorker,
    teardownServiceWorker,
};
