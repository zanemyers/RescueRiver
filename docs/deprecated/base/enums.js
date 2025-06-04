// Regex pattern to match phone numbers in international format (e.g., +1234567890)
const PHONE_REGEX = /\+[\d]+/;

// Regex pattern to match star ratings formatted as a decimal between 0.0 and 5.9 (e.g., "4.8")
const STARS_REGEX = /^[0-5]\.\d$/;

// Regex pattern to extract a number (used for review counts)
const REVIEW_COUNT_REGEX = /(\d+)/;

// Canonical names for known social media platforms
const SOCIAL_MEDIA = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  VIMEO: "Vimeo",
  WHATSAPP: "WhatsApp",
  X: "X (Twitter)",
  YOUTUBE: "YouTube",
};
