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
              }
            });

            console.log('Кодовые слова, которых нет во втором файле:');
            Object.entries(missingWords).forEach(([code, word]) => {
              console.log(`${code}: ${word}`);
              jsonData2[code] = word;
            });

            const updatedData2 = JSON.stringify(jsonData2, null, 2);

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
