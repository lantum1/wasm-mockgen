module.exports = {
    launch: {
        headless: false, // Запуск без интерфейса браузера
        slowMo: 50, // Замедление действий (удобно для отладки)
        defaultViewport: {
            width: 1280,
            height: 720,
        },
        args: [
            '--no-sandbox', // Убрать ограничения для окружений CI/CD
            '--disable-setuid-sandbox',
        ],
    },
};
