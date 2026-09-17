const PRODUCTIVE_APPS=new Set(['code','devenv','pycharm','webstorm','idea','windowsterminal','terminal','powershell','excel','winword','powerpnt','figma','obsidian','docker','postman','githubdesktop','xcode','pages','numbers','keynote']);
const ENTERTAINMENT_APPS=new Set(['netflix','tiktok','epicgameslauncher','steam']);
const MIXED_APPS=new Set(['spotify','discord','whatsapp','slack','teams','ms-teams','zoom','notion','instagram','facebook','reddit']);
const normalizeApp=value=>String(value||'').toLowerCase().replace(/\.exe$/,'').replace(/\.root$/,'').replace(/\s+/g,'');
const normalizeTitle=value=>String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
const learning=/\b(tutorial|course|lecture|lesson|research|documentation|docs|study|studying|learn|learning|workshop|training|assignment|homework|exam|math|mathematics|physics|chemistry|programming|coding)\b/i;
const working=/\b(pull request|localhost|spreadsheet|meeting|creator studio|youtube studio|analytics|figma)\b/i;
const entertainment=/\b(reels|shorts|memes?|gaming|gameplay|cat videos|music video|movie|movies|netflix|hotstar|prime video|gossip|celebrity gossip|bollywood gossip)\b/i;
const siteName=/\b(youtube|reddit|instagram|facebook|tiktok|twitter)\b/i;
function tokenize(value) {return normalizeTitle(value).split(/[^a-z0-9]+/).filter(word=>word.length>3);}
function classifyActivity(appName, windowTitle, learnedRules=[], website=null, overrides=[]) {
  const app=normalizeApp(appName),title=normalizeTitle(windowTitle);
  const domain=String(website||'').toLowerCase().replace(/^www\./,'');
  const valid=r=>['productive','distraction','neutral'].includes(r.category);
  const exact=learnedRules.filter(r=>valid(r)&&normalizeApp(r.appName)===app&&normalizeTitle(r.windowTitle)===title&&(r.website||'')===domain).at(-1);
  if(exact) return {category:exact.category,confidence:1,reason:'Your correction for this exact activity'};
  // Domain rules are more specific than app rules; never learn from a single generic title token.
  const rule=overrides.filter(r=>valid(r)&&r.scope==='website'&&String(r.match).toLowerCase()===domain).at(-1) || overrides.filter(r=>valid(r)&&r.scope==='app'&&normalizeApp(r.match)===app).at(-1);
  if(rule) return {category:rule.category,confidence:1,reason:`Your ${rule.scope} rule: ${rule.match}`};
  const study=learning.test(title),work=working.test(title),fun=entertainment.test(title);
  if ((study||work)&&fun) return {category:'neutral',confidence:.4,reason:'Both work/learning and entertainment signals; please review'};
  if (study) return {category:'productive',confidence:.84,reason:'Learning or research context, even on a mixed-use platform'};
  if (work) return {category:'productive',confidence:.8,reason:'Work context in the active window'};
  if (fun || ENTERTAINMENT_APPS.has(app)) return {category:'distraction',confidence:.84,reason:'Explicit entertainment context'};
  if (PRODUCTIVE_APPS.has(app)) return {category:'productive',confidence:.88,reason:'Local estimate: recognized development or document app'};
  if (MIXED_APPS.has(app)||siteName.test(title)||/^(youtube|instagram|reddit|facebook|x|spotify)\.com$/.test(domain)) return {category:'neutral',confidence:.35,reason:'Mixed-use app or site: purpose is unclear; set a rule or correct this entry'};
  if (/^(github\.com|gitlab\.com|stackoverflow\.com|developer\.mozilla\.org|docs\.python\.org)$/.test(domain)) return {category:'productive',confidence:.8,reason:'Development/reference website'};
  return {category:'neutral',confidence:.35,reason:'Not enough context; no distraction assumed'};
}
function createLearnedRule(segment, category) {return {appName:String(segment.appName||'Unknown'),windowTitle:normalizeTitle(segment.windowTitle),website:segment.website||null,tokens:[],category,weight:1,updatedAt:new Date().toISOString()};}
module.exports={classifyActivity,createLearnedRule,tokenize,normalizeApp};
