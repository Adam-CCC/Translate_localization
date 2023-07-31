const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

// Ваш IAM-токен от Yandex Cloud
const IAM_TOKEN = 't1.9euelZqQkpSXxseJj5yZmJmYkM2Wx-3rnpWaz5rJmZuPlYrHm5CMjYyKm4rl8_d-D2JZ-e98L2Ej_t3z9z4-X1n573wvYSP-zef1656VmpiRzc2Nk8iNlsuNi4rGmJSW7_zF656VmpiRzc2Nk8iNlsuNi4rGmJSW.q1MS37ijBRkWhbh2r8f-t8sSmMMOU4IvY0m3grTRrgufbAkB3ZDsDdShT0kOgebcTYhFtOZgyXmEInGCNY9TCA';
const FOLDER_ID = 'b1g2jfsjctrmjmpl626g';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//Функция временного выводв
function printText(text, color) {
  const colors = {
    // Цвета текста
    red: '\x1b[31m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    // Сброс цвета
    reset: '\x1b[0m'
  };
  process.stdout.clearLine(); // Очистим текущую строку
  process.stdout.cursorTo(0); // Переместим курсор в начало строки
  if (colors[color]) {
    process.stdout.write(colors[color] + text + colors.reset);
  } else {
      // Если передан некорректный цвет, выводим текст без изменений
      process.stdout.write(text);
  } // Выведем текст
} 

// Функция для проверки допустимости языкового кода
function isValidLanguageCode(languageCode, languages) {
  return languages.some(language => language.code === languageCode);
}

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
    printText('Translation error:', error.message);
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
    printText('Error processing missing words:', error.message);
    return null;
  }
}

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
            rl.question('\x1b[36mВведите язык перевода: \x1b[0m', async (language) => {
              try{
                printText("Загрузка...", "green");
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

                // Проверка введенного языкового кода
                const languagesResponse = await axios.post(
                  'https://translate.api.cloud.yandex.net/translate/v2/languages',
                  { folderId: FOLDER_ID},
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${IAM_TOKEN}`
                    }
                  }
                );

                const supportedLanguages = languagesResponse.data.languages;
                if (!isValidLanguageCode(language, supportedLanguages)) {
                  printText('Неправильно введен язык', 'red');
                  rl.close();
                  return;
                }

                const targetLanguage = language; // Язык перевода, в данном случае, русский
                const folderId = FOLDER_ID; // Замените на ваш реальный folder_id

                const translatedMissingWords = await translateFromMissingWords(missingWords, targetLanguage, folderId);

                if (Object.keys(missingWords).length === 0) {
                  printText( 'Нет отсутствующих слов', "green"); // Выводим "Нет отсутствующих слов" в зеленом цвете
                } else {
                  // Добавляем переведенные слова во второй файл
                  await addToSecondFile(file2Path.trim(), translatedMissingWords);
                  printText(`Данные успешно добавлены в файл: ${file2Path.trim()}`, "green");
                }

                rl.close();
              } catch(error) {
                console.error('Ошибка при вводе языка: ', error);
                rl.close();
              }
            });
          } catch (error) {
            console.error('Ошибка при разборе файла 2: ', error);
            rl.close();
          }
        });
      } catch (error) {
        console.error('Ошибка при чтении файла 1: ', error);
        rl.close();
      }
    });
  } catch (error) {
    console.error('Ошибка при разборе файлов: ', error);
    rl.close();
  }
}

// Запуск программы
compareFiles();
