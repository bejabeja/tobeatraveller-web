export const preloadImg = (src, onLoad) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        onLoad();
    };
}
