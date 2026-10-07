// Only the five faces the type scale uses. Importing per-weight paths keeps
// the other ~30 font files out of the app bundle.
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces/600SemiBold_Italic";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";

export const fontAssets = {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
};
