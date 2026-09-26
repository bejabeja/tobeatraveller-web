import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { PASSPORT_SHARE_METHODS } from "../../utils/analyticsEvents";
import { inAppBrowserName } from "../../utils/inAppBrowser";
import { canShareImages, copyLink, downloadImage, isDesktop } from "../../utils/shareImage";
import "./ShareImageActions.scss";

// Share a generated story image, with its link, through the system share
// sheet where the browser can share files; otherwise the link, to copy,
// with the image to download for a story. `onShared(method)` is told how
// it went out, for analytics.
const ShareImageActions = ({ blob, previewUrl, url, fileName, shareText, loading, onShared }) => {
  const { t } = useTranslation();
  const file = blob ? new File([blob], fileName, { type: "image/png" }) : null;
  const canShareFile = canShareImages(fileName);
  const inAppBrowser = canShareFile ? null : inAppBrowserName();

  const handleShare = async () => {
    // An Instagram story drops the text, so the link is also copied, ready
    // to paste into a link sticker.
    const copied = copyLink(url);
    try {
      await navigator.share({ files: [file], text: `${shareText} ${url}` });
      onShared(PASSPORT_SHARE_METHODS.SHARE_SHEET);
      if (await copied) toast.success(t("passport.linkCopied"));
    } catch (shareError) {
      // Closing the share sheet without picking an app is not an error.
      if (shareError.name !== "AbortError") toast.error(t("passport.shareError"));
    }
  };

  return (
    <>
      {canShareFile ? (
        <div className="share-actions__buttons">
          <button
            className="btn btn--ghost"
            onClick={() => { downloadImage(previewUrl, fileName); onShared(PASSPORT_SHARE_METHODS.DOWNLOAD); }}
            disabled={!previewUrl || loading}
          >
            {t("passport.downloadImage")}
          </button>
          <button className="btn btn--primary" onClick={handleShare} disabled={!file || loading}>
            {t("passport.shareImage")}
          </button>
        </div>
      ) : (
        // Without a share sheet (most desktop browsers) it is the link that
        // goes out; the image, for a story, is posted from the phone.
        <div className="share-actions__link">
          {inAppBrowser && (
            <p className="share-actions__in-app" role="note">{t("passport.inAppBrowserHint", { app: inAppBrowser })}</p>
          )}
          <div className="share-actions__link-row">
            <input
              className="share-actions__link-input"
              value={url ?? ""}
              readOnly
              onFocus={(event) => event.target.select()}
              aria-label={t("passport.linkLabel")}
            />
            <button
              type="button"
              className="btn btn--primary share-actions__copy"
              onClick={() => copyLink(url).then((copied) => {
                if (!copied) return;
                toast.success(t("passport.linkCopiedPlain"));
                onShared(PASSPORT_SHARE_METHODS.COPY_LINK);
              })}
            >
              {t("passport.copyLink")}
            </button>
          </div>
          <div className="share-actions__story">
            <p className="share-actions__hint">{t(isDesktop() ? "passport.downloadImageHintDesktop" : "passport.downloadImageHint")}</p>
            <button
              className="btn btn--ghost share-actions__download"
              onClick={() => { downloadImage(previewUrl, fileName); onShared(PASSPORT_SHARE_METHODS.DOWNLOAD); }}
              disabled={!previewUrl || loading}
            >
              {t("passport.downloadImage")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareImageActions;
