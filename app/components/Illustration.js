import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Image } from "expo-image";
import { BUNCH_SVG, PEELED_SVG } from "./illustrationSources";

// The app's banana artwork, from svgs/. The two SVGs render as vectors; the
// Illustrator EPS files are exported to transparent PNGs in assets/illustrations.
// Each entry's aspect is width / height of the artwork.
const ART = {
  bunch: { xml: BUNCH_SVG, aspect: 1 },
  peeled: { xml: PEELED_SVG, aspect: 1 },
  sliced: { source: require("../assets/illustrations/bananas-sliced.png"), aspect: 1050 / 576 },
  basket: { source: require("../assets/illustrations/banana-basket.png"), aspect: 1050 / 1034 },
  box: { source: require("../assets/illustrations/banana-box.png"), aspect: 1050 / 810 },
};

/**
 * Decorative banana illustration. Give it a width or a height; the other side
 * follows the artwork's proportions.
 *   name: "bunch" | "peeled" | "sliced" | "basket" | "box"
 */
export default function Illustration({ name, width, height, style }) {
  const art = ART[name];
  const w = width ?? height * art.aspect;
  const h = height ?? width / art.aspect;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ width: w, height: h }, style]}
    >
      {art.xml ? (
        <SvgXml xml={art.xml} width={w} height={h} />
      ) : (
        <Image source={art.source} style={{ width: w, height: h }} contentFit="contain" transition={0} />
      )}
    </View>
  );
}
