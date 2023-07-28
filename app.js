const fs = require('fs'); // Подключаем модуль fs для работы с файловой системой
const readline = require('readline'); // Подключаем модуль readline для чтения пользовательского ввода из консоли

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для чтения файла
function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// Функция для записи файла
function writeFile(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Функция для сравнения файлов
async function compareFiles() {
  try {
    rl.question('Введите путь к первому файлу: ', async (file1Path) => {
      try {
        const data1 = await readFile(file1Path.trim()); // Читаем данные из первого файла

        rl.question('Введите путь ко второму файлу: ', async (file2Path) => {
          try {
            const data2 = await readFile(file2Path.trim()); // Читаем данные из второго файла

            const jsonData1 = JSON.parse(data1); // Преобразуем данные первого файла в объект JSON
            const jsonData2 = JSON.parse(data2); // Преобразуем данные второго файла в объект JSON

            const missingWords = {};
            Object.entries(jsonData1).forEach(([code, word]) => {
              if (!jsonData2.hasOwnProperty(code)) { // Проверяем, есть ли кодовое слово во втором файле
                missingWords[code] = word; // Если слова нет во втором файле, добавляем его в объект missingWords
              }
            });

            console.log('Кодовые слова, которых нет во втором файле:');
            Object.entries(missingWords).forEach(([code, word]) => {
              console.log(`${code}: ${word}`); // Выводим кодовые слова, которых нет во втором файле, на консоль
              jsonData2[code] = word; // Добавляем недостающие слова из первого файла во второй файл
            });

            const updatedData2 = JSON.stringify(jsonData2, null, 2); // Преобразуем обновленные данные второго файла в формат JSON

            // Запись измененных данных обратно во второй файл
            await writeFile(file2Path.trim(), updatedData2);

            console.log('Данные успешно обновлены.');

            rl.close();
          } catch (error) {
            console.error('Ошибка при разборе JSON:', error);
            rl.close();
          }
        });
      } catch (error) {
        console.error('Ошибка при чтении файла 1:', error);
        rl.close();
      }
    });
  } catch (error) {
    console.error('Ошибка при чтении файла 2:', error);
    rl.close();
  }
}

// Запуск программы
compareFiles();
