const KEY = "msflix_taste_version_v1";

export function bumpTasteVersion() {
  const n = Number(localStorage.getItem(KEY) || "0") + 1;
  localStorage.setItem(KEY, String(n));
  return n;
}

export function getTasteVersion() {
  return Number(localStorage.getItem(KEY) || "0");
}
