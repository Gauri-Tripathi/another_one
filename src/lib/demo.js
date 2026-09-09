const now = Date.now();
export const demoSegments = [
  ["Visual Studio Code", "Purrductive — App.jsx", "productive", 5420, .96, "Development app"],
  ["Google Chrome", "Screen time research — Google Docs", "productive", 2880, .84, "Work title signal"],
  ["Figma", "Purrductive dashboard", "productive", 1960, .96, "Design app"],
  ["YouTube", "why cats purr for 10 hours", "distraction", 1740, .91, "Entertainment title signal"],
  ["Reddit", "r/OneOrangeBraincell", "distraction", 960, .93, "Social title signal"],
  ["Windows Explorer", "Downloads", "neutral", 540, .45, "Not enough context"]
].map(([appName, windowTitle, category, seconds, confidence, reason], index) => ({
  id: `demo-${index}`,
  appName,
  windowTitle,
  category,
  seconds,
  confidence,
  reason,
  startedAt: new Date(now - (index + 1) * 1800000).toISOString(),
  endedAt: new Date(now - index * 1800000).toISOString()
}));

