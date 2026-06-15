const ACTION_WORDS =
  "挠|笑|叹|皱|摇|点头|点了点|看|沉默|停顿|眨|抬|低|伸|摸|耸|摊|握|拍|捂|扶|靠|转|歪|眯|挑|擦|清了清|顿了顿";

const ACTION_GROUP = new RegExp(ACTION_WORDS);
const WRAPPED_ACTION_PATTERNS = [
  new RegExp(`[（(【\\[]\\s*[^）)】\\]\\n]{0,42}(?:${ACTION_WORDS})[^）)】\\]\\n]{0,42}\\s*[）)】\\]]`, "g"),
  new RegExp(`\\*+\\s*[^*\\n]{0,42}(?:${ACTION_WORDS})[^*\\n]{0,42}\\s*\\*+`, "g")
];

export function sanitizeDailyChatText(text: string) {
  let cleanText = text;

  for (const pattern of WRAPPED_ACTION_PATTERNS) {
    cleanText = cleanText.replace(pattern, "");
  }

  return cleanText
    .replace(/，{2,}/g, "，")
    .replace(/([，。！？、])\s*([，。！？、])/g, "$2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[，。！？、\s]+/, "")
    .trimEnd();
}

export function containsActionDirection(text: string) {
  return ACTION_GROUP.test(text);
}
