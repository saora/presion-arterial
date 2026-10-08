import profileTemplate from "./profile.html?raw";

export function renderProfilePage(): string {
  return profileTemplate;
}

export function initializeProfilePage(): void {
  console.log("PROFILE: initialized");
}
