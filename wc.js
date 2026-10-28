/* The work cards: data and markup (shared by mockups.html and motion.html). */
// Icons as the Nudge app uses them (lucide: fingerprint-pattern, shield-check, triangle-alert); marks from each product's own files.
var I = {
  fp: '<svg viewBox="0 0 24 24"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
  tri: '<svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  // nudge/case-study/assets/nudge-mark.svg
  nudge: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="7" stroke-dasharray="180 33.6" transform="rotate(112 50 50)" stroke-linecap="round"/><circle cx="50" cy="50" r="21" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="50" cy="50" r="9" fill="currentColor"/></svg>',
  // replix/src/components/Logo.tsx: three stacked frames, the front one with a play cut-out
  replix: '<svg viewBox="0 0 48 48" fill="none"><mask id="rxm"><rect width="48" height="48" fill="white"/><polygon points="27,24 27,34 35,29" fill="black"/></mask><rect x="4" y="4" width="28" height="22" rx="5" fill="currentColor" opacity=".28"/><rect x="10" y="11" width="28" height="22" rx="5" fill="currentColor" opacity=".58"/><rect x="16" y="18" width="28" height="22" rx="5" fill="currentColor" mask="url(#rxm)"/></svg>'
};
var F = function (cls, x, y, rz, inner, tag) { return "<" + (tag || "span") + " class=\"frag " + cls + "\" style=\"--x:" + x + "%;--y:" + y + "%;--rz:" + rz + "deg\">" + inner + "</" + (tag || "span") + ">"; };
// Titles: each project\x27s line from the Work page, a little longer, in its own words. The pieces behind each card are real bits of its UI.
var P = [
  { id: "nudge", name: "Nudge", yr: "2026", title: "Coding agents don’t fail, they wait.|I designed the phone remote that answers them.", tags: "AI product · Mobile · Live prototype", href: "https://adnnankhan.github.io/Nudge/", kind: "phone",
    m1: ["img/nudge-high-risk.webp", "Nudge: a high-risk force-push, with Hold to approve"], m2: ["img/nudge-home.webp", "Nudge home: what needs you first"], pins: [],
    bg: "<div class=\"mark\">" + I.nudge + "</div>" + F("chip c-hold", 6, 46, -4, I.fp + "Hold to approve") + F("chip c-high", 13, 60, 3, I.tri + "High risk") + F("chip c-low", 5, 74, -2, I.shield + "Low risk") },
  { id: "gitbrief", name: "GitBrief", yr: "2026", title: "Leaders can’t read commit logs.|I designed a weekly brief they can, and tested it with 5 of them.", tags: "AI product · Web · Working prototype", href: "https://adnnankhan.github.io/GitBrief/", kind: "web",
    m1: ["img/card-gitbrief-back.webp", "GitBrief activity page with a commits-over-time chart", 1.279], m2: ["img/card-gitbrief-front.webp", "GitBrief brief in plain language, with numbered proof marks", 1.513], pins: [],
    bg: "<div class=\"word\">GitBrief</div>" + F("chip s-ship", 6, 46, -3, "<i></i>shipped") + F("chip s-rev", 12, 58, 2, "<i></i>in review") + F("chip s-none", 5, 70, -2, "<i></i>no activity") + F("inf", 10, 83, 0, "inferred") },
  { id: "replix", name: "Replix", yr: "2026", title: "Every demo tool I checked starts from a screen recording.|I designed one that starts from your code.", tags: "AI product · Desktop · In development", href: "https://adnnankhan.github.io/Replix/", kind: "app",
    m1: ["img/replix-1-reading-code.webp", "Replix reading a codebase: the screens, features and flows it found", 2.218], m2: ["img/replix-2-storyboard.webp", "Replix storyboard: chat, video plan, scene timeline", 2.21], pins: [],
    bg: "<div class=\"logo\">" + I.replix + "</div>" + "", fg: F("scene sc2 fg", 1.5, 44, -4, "", "div") + F("scene sc3 fg", 3.5, 70, 3, "", "div") },
  { id: "fitbite", name: "FitBite", yr: "2025", title: "Most people don’t fail their diets. Their systems do.|So I designed one for the moment intention breaks.", tags: "Health · Mobile · Concept", href: "https://www.figma.com/deck/PD4XyMT1EzsWULsxSRiOuc", kind: "phone",
    m1: ["img/card-fitbite-back.webp", "FitBite plan-ready screen"], m2: ["img/card-fitbite-front.webp", "FitBite home screen"], pins: [],
    bg: F("chip", 5, 37, -4, "<span class=\"ok\"><svg viewBox=\"0 0 24 24\"><path d=\"M20 6 9 17l-5-5\"/></svg></span>Plan Ready!") +
        F("chip", 10, 50, 3, "<svg class=\"ring\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\" stroke=\"#E3EEE8\" stroke-width=\"3.5\"/><circle cx=\"12\" cy=\"12\" r=\"9\" stroke=\"#054D2B\" stroke-width=\"3.5\" stroke-dasharray=\"40 57\" transform=\"rotate(-90 12 12)\"/></svg>620 Calories remaining") +
        F("chip", 4, 63, -2, "<img class=\"ic\" src=\"img/fb/badge-fire.webp\" alt=\"\">7 day streak") +
        "<div class=\"box\"><img src=\"img/fb/mealbox.webp\" width=\"400\" height=\"600\" alt=\"\"></div>" }
  ,
  // Craftstudioo: the title is his own line from the Work page
  { id: "craft", name: "Craftstudioo", yr: "2025", title: "The agency I worked at had no website.|I designed one and shipped it in a month.", tags: "Agency work · Web · Shipped", href: "https://adnan.world/craftstudioo/", kind: "web", dark: true,
    m1: ["img/card-craftstudioo-back.jpg", "Services section of the Craftstudioo website", 1.333], m2: ["img/card-craftstudioo-front.jpg", "Homepage of the Craftstudioo website", 1.695], pins: [],
    bg: "<div class=\"logo\"></div>" + F("chip", 6, 44, -3, "Content Creation") + F("chip", 12, 57, 2, "UI / UX") + F("chip", 5, 70, -2, "Web Development") },
  // Where did my money go?: "Miscellaneous is where an app hides the fact that it doesn’t know." is his line from the case study
  { id: "money", name: "Where did my money go?", yr: "2026", title: "Miscellaneous is where an app hides that it doesn’t know.|I designed one that admits it, and asks you once.", tags: "Fintech · Mobile · Concept", href: "https://adnnankhan.github.io/Where-did-my-money-go/", kind: "phone",
    m1: ["img/card-money-back.jpg", "Where did my money go? sort screen: three payments it couldn’t tell"], m2: ["img/card-money-front.jpg", "Where did my money go? home: monthly spending by category"], pins: [],
    bg: "<div class=\"word\">Miscellaneous</div>" + F("chip c-sort", 5, 44, -3, "3 payments need you · Sort →") + F("chip c-pipe", 11, 58, 2, "razorpay@hdfcbank") + F("c-cant", 6, 72, 0, "I can’t tell what this was.") },
  // Diney: "Get us in without the wait" and "from finding a table to leaving happy" are from his Work page card
  { id: "diney", name: "Diney", yr: "First study", title: "Eating out shouldn’t start with a wait.|My first case study, from finding a table to leaving happy.", tags: "Food · Mobile · Concept", href: "https://www.figma.com/deck/feWjt208BsF0enTrTwmx9L/Diney-Case-Study?node-id=1-42&t=RbZKK9kaXilGzOGq-1", kind: "phone",
    m1: ["img/card-diney-back.jpg", "Diney restaurant page with menu"], m2: ["img/card-diney-front.jpg", "Diney home screen with nearby restaurants and offers"], pins: [],
    bg: "<div class=\"word\">Diney</div>" + F("chip c-off", 6, 44, -3, "upto 30% off") + F("chip", 12, 57, 2, "★ 4.2") + F("chip", 5, 70, -2, "<svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4\"/><path d=\"M8 2v4\"/><path d=\"M3 10h18\"/></svg>Book Table") },
  // Help me choose: "an antidote to decision paralysis, thought through in a few hours" and "make the choice feel smaller" are from his Work page card
  { id: "choose", name: "Help me choose", yr: "A few hours", title: "Too many options freeze people.|In a few hours, I sketched an AI that makes the choice feel smaller.", tags: "AI UX · Experiment · Concept", href: "https://medium.com/@adnanasifkhan24/help-me-choose-ux-concept-5f0c9927498f", kind: "concept", pins: [],
    stage: "<div class=\"mk m1\" role=\"img\" aria-label=\"Three options, two set aside, one picked: This one.\"><div class=\"opt o1\"><span class=\"k\">Option A</span><i></i><i></i><i class=\"s\"></i></div><div class=\"opt o2\"><span class=\"k\">Option B</span><i></i><i></i><i class=\"s\"></i></div><div class=\"opt pick\"><span class=\"k\">Option C<b>✓</b></span><i></i><i></i><i class=\"s\"></i><strong>This one.</strong></div></div>",
    bg: F("chip", 6, 46, -3, "which one should I pick?") }
];
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function pins(p, w) { return p.pins.filter(function (q) { return q[1] === w; }).map(function (q) { return '<span class="pin" style="left:' + q[2] + '%;top:' + q[3] + '%">' + q[0] + '<span>' + q[4] + '</span></span>'; }).join(''); }
function mock(p, w, cls) {
  if (p.kind === 'concept') return w === 'm1' ? p.stage : '';
  var s = p[w], img = '<img src="' + s[0] + '" alt="' + esc(s[1]) + '" decoding="async">' + pins(p, w);
  if (p.kind === 'phone') return '<div class="mk ' + cls + ' ' + w + ' phone"><div class="scr">' + img + '</div></div>';
  return '<div class="mk ' + cls + ' ' + w + ' win' + (p.kind === 'app' ? ' dark app' : p.dark ? ' dark' : '') + '"><div class="chrome"><i></i><i></i><i></i><u></u></div><div class="scr" style="--ar:' + s[2] + '">' + img + '</div></div>';
}
// one card's HTML
function cardHTML(p) {
  return '<article class="wc ' + p.id + '"><a class="cover" href="' + p.href + '" target="_blank" rel="noopener" aria-label="' + esc(p.name + ': ' + p.title.replace("|", " ") + ' Open the case study') + '"></a>' +
    '<div class="bgx" aria-hidden="true">' + p.bg + '</div>' +
    '<header class="hd"><span class="nm">' + p.name + '</span><span class="yr">' + p.yr + '</span><span class="tg">' + p.tags + '</span><span class="ar" aria-hidden="true">↗</span></header>' +
    '<h3 class="ti"><span class="in">' + p.title.split("|")[0] + '</span> <span class="do">' + p.title.split("|")[1] + '</span></h3><div class="stage">' + mock(p, 'm1', 'b') + mock(p, 'm2', 'f') + (p.fg || '') + '</div></article>';
}
window.WC = { P: P, cardHTML: cardHTML };
