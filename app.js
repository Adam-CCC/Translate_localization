const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

// Ваш IAM-токен от Yandex Cloud
const IAM_TOKEN = 't1.9euelZrHnsuay5bPno_PkY7NjMbPy-3rnpWaz5rJmZuPlYrHm5CMjYyKm4rl8_cuLGdZ-e9zPQc0_N3z925aZFn573M9BzT8zef1656Vmp6XlJWcm5ieyMbJnMyby86Q7_zF656Vmp6XlJWcm5ieyMbJnMyby86Q.vcPi7fLh1Hwh4j9BaaCjv_GvbFGQm1HZl01rFqaYqFJoBKoUUAlc3cb2kfVn8JHlEja9G1yHxpVPe1a1DW7dCg';

// Функция для отправки запроса к Yandex Translate API
async function translateTexts(texts, targetLanguage, folderId) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${IAM_TOKEN}`
  };

  // Функция для извлечения плейсхолдеров из текста
  const extractPlaceholders = (text) => {
    const placeholders = text.match(/{{.+?}}/g) || [];
    return placeholders.map(placeholder => ({ original: placeholder, replacement: `__PLACEHOLDER_${placeholders.indexOf(placeholder)}__` }));
  };

  // Заменяем плейсхолдеры в исходных текстах
  const placeholderMaps = texts.map(text => {
    const placeholders = extractPlaceholders(text);
    let modifiedText = text;
    placeholders.forEach((placeholder, index) => {
      modifiedText = modifiedText.replace(placeholder.original, placeholder.replacement);
    });
    return { originalText: text, modifiedText, placeholders };
  });

  const body = {
    targetLanguageCode: targetLanguage,
    texts: placeholderMaps.map(item => item.modifiedText), // Передаем модифицированные тексты для перевода
    folderId
  };

  try {
    const response = await axios.post('https://translate.api.cloud.yandex.net/translate/v2/translate', body, { headers });
    const translations = response.data.translations.map((translation, index) => {
      const { placeholders } = placeholderMaps[index];
      let translatedText = translation.text;
      placeholders.forEach(placeholder => {
        translatedText = translatedText.replace(placeholder.replacement, placeholder.original);
      });
      return translatedText;
    });
    return translations;
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

// Функция для добавления переведенных слов во второй файл
async function addToSecondFile(filePath, jsonData) {
  try {
    const updatedData = JSON.stringify(jsonData, null, 2);
    const data2 = await readFile(filePath);
    const lastIndex = data2.lastIndexOf('\n}'); // Находим индекс последнего слова перед закрывающей фигурной скобкой

    // Добавляем двойной пробел перед каждой строкой переведенных данных
    const indentedUpdatedData = updatedData.replace(/\n/g, '\n  ');

    await fs.promises.writeFile(filePath, data2.slice(0, lastIndex) + `,\n  ${indentedUpdatedData.slice(1, -1)}\n}`, 'utf8');
  } catch (error) {
    console.error('Ошибка при добавлении переведенных слов во второй файл:', error);
  }
}

// Функция для сравнения файлов
async function compareFiles() {
  try {
    rl.question('\x1b[36mВведите путь к первому файлу: \x1b[0m', async (file1Path) => {
      try {
        const data1 = await readFile(file1Path.trim());

        rl.question('\x1b[36mВведите путь ко второму файлу: \x1b[0m', async (file2Path) => {
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
            if (Object.keys(missingWords).length === 0) {
              console.log('\x1b[32m%s\x1b[0m', 'Нет отсутствующих слов'); // Выводим "Нет отсутствующих слов" в зеленом цвете
            } else {
              // Добавляем переведенные слова во второй файл
              await addToSecondFile(file2Path.trim(), translatedMissingWords);
        
              console.log('\x1b[32m%s\x1b[0m', 'Переведенные слова добавлены во второй файл.');
        
              console.log('\x1b[32m%s\x1b[0m', `Данные успешно сохранены в файле: ${file2Path.trim()}`);
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