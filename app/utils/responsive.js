import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const BASE_WIDTH = 390; // the iPhone width these screens were designed against

// scales a size proportionally to how wide the actual device is
export function scale(size) {
  return Math.round((width / BASE_WIDTH) * size);
}
