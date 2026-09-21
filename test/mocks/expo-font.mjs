export function useFonts(map) {
  return [true, null];
}
export async function loadAsync() {
  return Promise.resolve();
}
export function isLoaded() {
  return true;
}
export default {
  useFonts,
  loadAsync,
  isLoaded,
};
