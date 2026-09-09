const PRODUCTIVE_APPS = ["code", "devenv", "pycharm", "webstorm", "idea", "terminal", "powershell", "excel", "winword", "powerpnt", "figma", "notion", "obsidian", "slack", "teams", "zoom", "docker", "postman", "linear", "github desktop"];
const DISTRACTION_APPS = ["steam", "epicgameslauncher", "netflix", "spotify", "discord", "tiktok", "instagram", "facebook", "reddit"];
const PRODUCTIVE_WORDS = ["docs", "document", "spreadsheet", "dashboard", "project", "pull request", "github", "figma", "notion", "calendar", "meeting", "research", "course", "tutorial", "localhost"];
const DISTRACTION_WORDS = ["youtube", "netflix", "reddit", "instagram", "facebook", "tiktok", "prime video", "hotstar", "reels", "shorts", "gaming", "meme"];

function tokenize(text) {
  return String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3);
}

function classifyActivity(appName, windowTitle, learnedRules = []) {
  const app = String(appName || "").toLowerCase();
  const title = String(windowTitle || "").toLowerCase();
  const tokens = tokenize(title);
  const learned = learnedRules
    .filter(rule => rule.appName.toLowerCase() === app && rule.tokens.some(token => tokens.includes(token)))
    .sort((a, b) => b.weight - a.weight)[0];
  if (learned) return { category: learned.category, confidence: Math.min(.99, .75 + learned.weight * .04), reason: "Learned from your corrections" };

  if (PRODUCTIVE_APPS.some(value => app.includes(value))) return { category: "productive", confidence: .96, reason: "Development or work app" };
  if (DISTRACTION_APPS.some(value => app.includes(value))) return { category: "distraction", confidence: .95, reason: "Entertainment or social app" };

  const productiveMatches = PRODUCTIVE_WORDS.filter(value => title.includes(value));
  const distractionMatches = DISTRACTION_WORDS.filter(value => title.includes(value));
  if (productiveMatches.length > distractionMatches.length) return { category: "productive", confidence: Math.min(.92, .7 + productiveMatches.length * .08), reason: `Work signal: ${productiveMatches[0]}` };
  if (distractionMatches.length > productiveMatches.length) return { category: "distraction", confidence: Math.min(.92, .72 + distractionMatches.length * .08), reason: `Distraction signal: ${distractionMatches[0]}` };
  return { category: "neutral", confidence: .42, reason: "Not enough context" };
}

function createLearnedRule(segment, category) {
  const tokens = tokenize(segment.windowTitle).slice(0, 5);
  return { appName: String(segment.appName || "Unknown"), tokens, category, weight: 1, updatedAt: new Date().toISOString() };
}

module.exports = { classifyActivity, createLearnedRule, tokenize };

