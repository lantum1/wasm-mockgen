import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupServiceWorker, deregisterServiceWorker } from './utils/serviceWorkerUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Тесты ручек сервиса Python и Go одновременно', function () {
    let browser;
    let page;
    let serverProcess;

    before(async function () {
        this.timeout(20000);

        const serverPath = path.join(__dirname, './workers/public');
        
        serverProcess = spawn('cmd', ['/s', '/c', 'npx', 'http-server', serverPath, '-p', 8081, {shell: true}], {
            stdio: 'inherit',
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));

        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox'],
        });

        page = await browser.newPage();

        page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

        await setupServiceWorker({
            page: page,
            workerFile: '/sw.js',
            scope: '/',
            modulesNames: ['api-python', 'api'],
            port: 8081
        });

        await page.exposeFunction('alert', (message) => {
            console.log('Alert:', message);
        });
    });

    after(async function () {
        await deregisterServiceWorker({
            page,
            scope: '/',
            port: 8081
        });
        
        if (browser) {
            await browser.close();
        }
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    afterEach(async function () {
        await page.evaluate(() => {
            window.alert = undefined;
        });
    });

    it('Должно вызвать alert, ручка /api-python/greet (Python)', async function () {
        const result = await page.evaluate(async () => {
            const response = await fetch('/api-python/greet');
            return response.json();
        });

        console.log(result);
        if (result.message !== 'Hello, World!') {
            throw new Error('Ответ от ручки /greet некорректный');
        }
    });

    it('Должно вызвать alert, ручка /api-python/echo (Python)', async function () {
        const input = 'test';
        const result = await page.evaluate(async (input) => {
            const response = await fetch('/api-python/echo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input }),
            });
            return response.json();
        }, input);

        console.log(result);
        if (!result.you_sent || result.you_sent.message !== input) {
            throw new Error('Ответ от ручки /echo некорректный');
        }
    });

    it('Должно вызвать alert, ручка /api/health (Go)', async function () {
        const result = await page.evaluate(async () => {
            const response = await fetch('http://localhost:8081/api/health');
            return response.json();
        });

        console.log(result);

        if (result.Status !== 'healthy') {
            throw new Error('Ответ от ручки /health некорректный');
        }
    });
});
