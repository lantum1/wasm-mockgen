import puppeteer from 'puppeteer';
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import kill from 'tree-kill';

import { setupServiceWorker, deregisterServiceWorker } from './utils/serviceWorkerUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Тесты интернет-магазина', function () {
    let browser;
    let page;
    let nextServerProcess;

    before(async function () {
        this.timeout(180000);

        console.log('Сборка проекта...');
        spawnSync('npm', ['run', 'build'], {
            cwd: path.join(__dirname, '../app'),
            stdio: 'inherit',
            shell: true,
        });

        console.log('Запуск сервера...');
        nextServerProcess = spawn('npm', ['run', 'start'], {
            cwd: path.join(__dirname, '../app'),
            stdio: 'inherit',
            shell: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

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
            modulesNames: ['my-store-service'],
            port: 3000
        });

        await page.exposeFunction('alert', (message) => {
            console.log('Alert:', message);
        });

        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    });

    after(async function () {
        this.timeout(180000);

        await deregisterServiceWorker({
            page,
            scope: '/',
            port: 3000
        });

        if (browser) {
            await browser.close();
        }
        if (nextServerProcess) {
            kill(nextServerProcess.pid);
        }
    });

    it('Должны загружаться товары', async function () {
        await page.waitForSelector('.product-item', { timeout: 180000 });

        const products = await page.evaluate(() =>
            Array.from(document.querySelectorAll('.product-item span')).map(el => el.textContent.trim())
        );

        console.log('Загруженные товары:', products);
        if (products.length === 0) {
            throw new Error('Товары не загрузились!');
        }
    });

    it('При покупке товара количество уменьшается', async function () {
        await page.waitForSelector('.product-item button', { timeout: 180000 });

        const initialQuantity = await page.evaluate(() => {
            return document.querySelector('.product-item span').textContent.trim();
        });

        console.log('Исходное количество:', initialQuantity);

        await page.click('.product-item button', { timeout: 180000 });

        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedQuantity = await page.evaluate(() => {
            return document.querySelector('.product-item span').textContent.trim();
        });

        console.log('Обновленное количество:', updatedQuantity);

        if (initialQuantity === updatedQuantity) {
            throw new Error('Количество товара не изменилось после покупки!');
        }
    });
});
