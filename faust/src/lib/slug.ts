const TRANSLITERATION: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  "'": "",
  "’": "",
  ʼ: "",
};

/** Word-initial forms differ from the ones inside a word: Її → Yii, не Iii. */
const INITIAL_TRANSLITERATION: Record<string, string> = {
  є: "ye",
  ї: "yi",
  й: "y",
  ю: "yu",
  я: "ya",
};

export const slugify = (source: string): string => {
  const lower = source.trim().toLowerCase();
  let result = "";
  let atWordStart = true;

  for (const character of lower) {
    const table = atWordStart
      ? (INITIAL_TRANSLITERATION[character] ?? TRANSLITERATION[character])
      : TRANSLITERATION[character];

    if (table !== undefined) {
      result += table;
      atWordStart = false;
      continue;
    }

    if (/[a-z0-9]/.test(character)) {
      result += character;
      atWordStart = false;
      continue;
    }

    result += "-";
    atWordStart = true;
  }

  return result.replace(/-+/g, "-").replace(/^-|-$/g, "");
};
