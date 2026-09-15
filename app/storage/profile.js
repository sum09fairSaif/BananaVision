import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bananavision.profile.v1";

// Returns the saved profile, or null on the very first launch after install.
// A profile with an empty firstName means the user chose to skip the prompt.
export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return typeof profile?.firstName === "string" ? profile : null;
  } catch {
    // Corrupt or unreadable storage: treat as a first launch rather than crash.
    return null;
  }
}

export async function saveProfile(firstName) {
  const profile = { firstName, savedAt: Date.now() };
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}
