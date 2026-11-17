// Called back whether the image loaded or failed: what waits for it (a page
// faded in once its photo is ready) must not stay hidden if it never comes.
export const preloadImg = (src, onSettled) => {
    const img = new Image();
    img.onload = () => onSettled();
    img.onerror = () => onSettled();
    img.src = src;
}
