const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

// Ваш IAM-токен от Yandex Cloud
const IAM_TOKEN = 't1.9euelZqOl5SSk5jNmMqMz8uOl56Tju3rnpWaz5rJmZuPlYrHm5CMjYyKm4rl8_dVO3FZ-e9QRTBd_t3z9xVqbln571BFMF3-zef1656VmpyTmpDHx5aXzpPKz8vIy5bH7_zF656VmpyTmpDHx5aXzpPKz8vIy5bH.T5pT3O9CfJiUrAHqMvG1a2XfetxBd9dsk1ZY-FyusfDKC5z4x-tBgr1MoazxEK0m458fF-hthxcNo9bIzXhpBw';

// Функция для отправки запроса к Yandex Translate API
async function translateTexts(texts, targetLanguage, folderId) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${IAM_TOKEN}`
  };

  const body = {
    targetLanguageCode: targetLanguage,
    texts,
    folderId
  };

  try {
    const response = await axios.post('https://translate.api.cloud.yandex.net/translate/v2/translate', body, { headers });
    return response.data.translations.map(translation => translation.text);
  } catch (error) {
    console.error('Translation error:', error.message);
    return [];
  }
}

// Функция для чтения JSON-файла и перевода слов
async function translateFromMissingWords(missingWords, targetLanguage, folderId) {
  try {
    const texts = Object.values(missingWords);

    const translatedTexts = await translateTexts(texts, targetLanguage, folderId);

    const translatedJson = {};
    Object.keys(missingWords).forEach((key, index) => {
      translatedJson[key] = translatedTexts[index];
    });

    return translatedJson; // Возвращаем переведенный JSON-объект
  } catch (error) {
    console.error('Error processing missing words:', error.message);
    return null;
  }
}

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

            const targetLanguage = 'ru'; // Язык перевода, в данном случае, русский
            const folderId = 'b1g2jfsjctrmjmpl626g'; // Замените на ваш реальный folder_id

            const translatedMissingWords = await translateFromMissingWords(missingWords, targetLanguage, folderId);

            if (translatedMissingWords) {
              // Объединяем переведенные слова с данными из второго файла
              Object.assign(jsonData2, translatedMissingWords);
              console.log('Переведенные слова добавлены во второй файл.');

              // Запись измененных данных обратно во второй файл
              const updatedData2 = JSON.stringify(jsonData2, null, 2); // Преобразуем обновленные данные второго файла в формат JSON
              await writeFile(file2Path.trim(), updatedData2);

              console.log(`Данные успешно сохранены в файле: ${file2Path.trim()}`);
            }

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
