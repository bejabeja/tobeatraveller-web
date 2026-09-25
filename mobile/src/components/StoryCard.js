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

// Proportions of the ink seal, relative to its diameter (a 600px seal has a
// 14px ring and a dashed inner ring 20px inside it), as on the web images.
const SEAL_RING_WIDTH = 14 / 600;
const SEAL_INNER_RING_INSET = 20 / 600;
const SEAL_INNER_RING_WIDTH = 6 / 600;

// An ink seal like the passport's stamps: paper disc, solid ring, dashed
// inner ring, with a flag or emoji inside. `diameter` is in image pixels.
export const InkSeal = ({ diameter, style, children }) => (
  <View
    style={[styles.seal, {
      width: storyScale(diameter), height: storyScale(diameter), borderRadius: storyScale(diameter / 2),
      borderWidth: storyScale(diameter * SEAL_RING_WIDTH),
    }, style]}
  >
    <View
      style={[styles.sealInner, {
        top: storyScale(diameter * SEAL_INNER_RING_INSET), left: storyScale(diameter * SEAL_INNER_RING_INSET),
        right: storyScale(diameter * SEAL_INNER_RING_INSET), bottom: storyScale(diameter * SEAL_INNER_RING_INSET),
        borderRadius: storyScale(diameter / 2), borderWidth: storyScale(diameter * SEAL_INNER_RING_WIDTH),
      }]}
    />
    {children}
  </View>
);

const styles = StyleSheet.create({
  seal: { alignItems: 'center', justifyContent: 'center', backgroundColor: STORY_COLORS.PAPER, borderColor: STORY_COLORS.GOLD },
  sealInner: { position: 'absolute', borderStyle: 'dashed', borderColor: 'rgba(217, 164, 65, 0.7)' },
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
