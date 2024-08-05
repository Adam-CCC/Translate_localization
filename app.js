const fs = require('fs');

// Функция для чтения JSON файла
function readJsonFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

// Функция для вывода переводов на консоль
function printTranslations(data) {
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            console.log(data[key]);
        }
    }
}

// Основная функция
function main() {
    const inputFilePath = 'en.json'; // Путь к входному JSON файлу

    // Чтение JSON файла
    const data = readJsonFile(inputFilePath);

    // Вывод переводов на консоль
    printTranslations(data);

    console.log('Translations have been printed to the console.');
}

// Вызов основной функции
main();
