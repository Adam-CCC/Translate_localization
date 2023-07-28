const fs = require('fs');
const readline = require('readline');

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
        const data1 = await readFile(file1Path.trim());

        rl.question('Введите путь ко второму файлу: ', async (file2Path) => {
          try {
            const data2 = await readFile(file2Path.trim());

            const jsonData1 = JSON.parse(data1);
            const jsonData2 = JSON.parse(data2);

            const missingWords = {};
            Object.entries(jsonData1).forEach(([code, word]) => {
              if (!jsonData2.hasOwnProperty(code)) {
                missingWords[code] = word;
                jsonData2[code] = word; // Добавляем недостающие слова из первого файла во второй файл
              }
            });

            console.log('Кодовые слова, которых нет во втором файле:');
            Object.entries(missingWords).forEach(([code, word]) => {
              console.log(`${code}: ${word}`);
            });

            const missingWordsFileName = 'missing_words.json'; // Имя файла для сохранения данных missingWords

            const missingWordsData = JSON.stringify(missingWords, null, 2); // Преобразуем данные в формат JSON
            await writeFile(missingWordsFileName, missingWordsData); // Записываем данные в файл

            // Запись измененных данных обратно во второй файл
            const updatedData2 = JSON.stringify(jsonData2, null, 2); // Преобразуем обновленные данные второго файла в формат JSON
            await writeFile(file2Path.trim(), updatedData2);

            console.log(`Данные успешно сохранены в файле: ${missingWordsFileName}`);

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
