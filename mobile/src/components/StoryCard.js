import { PixelRatio, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

// Instagram/WhatsApp story size, so a shared image fills the screen as a story.
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
// The card is laid out at the image's real size (in logical pixels) so the
// capture is sharp, and only shrunk on screen for the preview. A transform
// on the wrapper doesn't reach the captured view itself.
const CARD_WIDTH = STORY_WIDTH / PixelRatio.get();
const CARD_HEIGHT = STORY_HEIGHT / PixelRatio.get();

export const STORY_COLORS = Object.freeze({ NAVY: '#1b2a41', GOLD: '#d9a441', PAPER: '#fbf6ec', INK_MUTED: '#8a8172' });

// Sizes are the web images' (client/src/utils/*ShareImage.js), in image
// pixels, so web and app share the same-looking images.
export const storyScale = (size) => (size * CARD_WIDTH) / STORY_WIDTH;

export const storyPreviewHeight = (previewWidth) => CARD_HEIGHT * (previewWidth / CARD_WIDTH);

// The story card (navy, with its gold frame) shown shrunk to `previewWidth`.
// `cardRef` is the view to capture.
export const StoryCardPreview = ({ cardRef, previewWidth, children }) => {
  const previewScale = previewWidth / CARD_WIDTH;
  const previewHeight = storyPreviewHeight(previewWidth);
  return (
    <View style={{ width: previewWidth, height: previewHeight, overflow: 'hidden' }}>
      {/* Scaling shrinks around the centre, so the card is first centred on the (smaller) preview box. */}
      <View
        style={[styles.scaler, {
          left: (previewWidth - CARD_WIDTH) / 2,
          top: (previewHeight - CARD_HEIGHT) / 2,
          transform: [{ scale: previewScale }],
        }]}
      >
        {/* collapsable={false}: Android would otherwise drop this view
            from the native tree and there would be nothing to capture. */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <View style={styles.frame} pointerEvents="none" />
          {children}
        </View>
      </View>
    </View>
  );
};

// Captures the card as a story-sized PNG and opens the share sheet with it.
// The share sheet only takes the image, so `link` goes to the clipboard,
// ready to paste into an Instagram link sticker. Throws if it can't share.
export const captureAndShareStory = async (cardRef, { link, dialogTitle }) => {
  const uri = await captureRef(cardRef, {
    format: 'png', quality: 1, result: 'tmpfile', width: CARD_WIDTH, height: CARD_HEIGHT,
  });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  await Clipboard.setStringAsync(link);
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
};

const styles = StyleSheet.create({
  scaler: { position: 'absolute', width: CARD_WIDTH, height: CARD_HEIGHT },
  card: {
    width: CARD_WIDTH, height: CARD_HEIGHT,
    alignItems: 'center', backgroundColor: STORY_COLORS.NAVY,
    paddingTop: storyScale(150), paddingHorizontal: storyScale(90),
  },
  frame: {
    position: 'absolute', top: storyScale(36), left: storyScale(36), right: storyScale(36), bottom: storyScale(36),
    borderWidth: storyScale(3), borderColor: 'rgba(217, 164, 65, 0.45)', borderRadius: storyScale(48),
  },
});
