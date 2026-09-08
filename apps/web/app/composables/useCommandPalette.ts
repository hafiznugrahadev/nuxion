const open = ref(false);

export function useCommandPalette() {
  function openPalette() {
    open.value = true;
  }
  function closePalette() {
    open.value = false;
  }
  return { open, openPalette, closePalette };
}
