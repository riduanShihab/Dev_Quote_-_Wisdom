const fs = require('fs');
const path = require('path');

const STREAK_PATH = path.join(__dirname, 'streak.json');
const QUOTES_PATH = path.join(__dirname, 'quotes.json');
const ACTIVITY_PATH = path.join(__dirname, 'ACTIVITY.md');
const README_PATH = path.join(__dirname, 'README.md');

// Milestone thresholds & titles
const MILESTONES = [
  { target: 7, title: '🌱 Seedling' },
  { target: 14, title: '🌿 Sprout' },
  { target: 30, title: '🚀 Momentum' },
  { target: 60, title: '💎 Diamond' },
  { target: 100, title: '👑 Centurion' },
  { target: 180, title: '⚡ Veteran' },
  { target: 365, title: '🏆 Grandmaster' },
];

function getMilestoneInfo(streakDays) {
  let prevTarget = 0;
  for (const m of MILESTONES) {
    if (streakDays <= m.target) {
      const range = m.target - prevTarget;
      const progressInRange = Math.max(0, streakDays - prevTarget);
      const percentage = Math.min(100, Math.round((progressInRange / range) * 100));
      return {
        nextGoal: m.target,
        title: m.title,
        percentage,
        progressText: `${streakDays}/${m.target} Days`
      };
    }
    prevTarget = m.target;
  }
  return {
    nextGoal: 365,
    title: '🏆 Grandmaster',
    percentage: 100,
    progressText: `${streakDays} Days (Goal Reached!)`
  };
}

function renderProgressBar(percentage, size = 18) {
  const filled = Math.round((percentage / 100) * size);
  const empty = size - filled;
  return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + '] ' + percentage + '%`';
}

// Fetch live quote from public API with timeout and fallback
async function fetchQuote(localQuotes, lastQuote) {
  // 50% chance to query public API if available
  const tryLiveApi = Math.random() < 0.55;

  if (tryLiveApi && typeof fetch === 'function') {
    // API 1: ZenQuotes
    try {
      const res = await fetch('https://zenquotes.io/api/random', {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0] && data[0].q && data[0].a) {
          return {
            quote: data[0].q.trim(),
            author: data[0].a.trim(),
            category: 'Wisdom & Mindset',
            source: '🌐 Live API (ZenQuotes)'
          };
        }
      }
    } catch (_) {
      // Fall through to second API or local
    }

    // API 2: DummyJSON Quotes
    try {
      const res = await fetch('https://dummyjson.com/quotes/random', {
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.quote && data.author) {
          return {
            quote: data.quote.trim(),
            author: data.author.trim(),
            category: 'Philosophy & Growth',
            source: '🌐 Live API (DummyJSON)'
          };
        }
      }
    } catch (_) {
      // Fall through to local quotes
    }
  }

  // Fallback to local curated archive
  const candidateQuotes = localQuotes.filter(q => q.quote !== lastQuote);
  const pool = candidateQuotes.length > 0 ? candidateQuotes : localQuotes;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  return {
    quote: picked.quote,
    author: picked.author,
    category: picked.category || 'Engineering Wisdom',
    source: '📚 Curated Archive'
  };
}

async function run() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0] + ' UTC';
  const fullTimestamp = `${dateStr} ${timeStr}`;

  // Read streak data
  let streak = {
    currentStreak: 0,
    longestStreak: 0,
    totalCommits: 0,
    startDate: dateStr,
    lastUpdated: null,
    lastQuote: null,
    lastAuthor: null,
    lastCategory: null,
    lastSource: null
  };

  if (fs.existsSync(STREAK_PATH)) {
    try {
      streak = Object.assign(streak, JSON.parse(fs.readFileSync(STREAK_PATH, 'utf8')));
    } catch (e) {
      console.warn('Failed to parse streak.json, creating a fresh one.');
    }
  }

  // Load local quotes pool
  let localQuotes = [];
  if (fs.existsSync(QUOTES_PATH)) {
    try {
      localQuotes = JSON.parse(fs.readFileSync(QUOTES_PATH, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse quotes.json.');
    }
  }
  if (!localQuotes || localQuotes.length === 0) {
    localQuotes = [
      { quote: 'Consistency is what transforms average into excellence.', author: 'Anonymous', category: 'Habits' }
    ];
  }

  // Fetch or pick quote
  const selectedQuote = await fetchQuote(localQuotes, streak.lastQuote);

  // Update counters
  streak.currentStreak = (streak.currentStreak || 0) + 1;
  streak.longestStreak = Math.max(streak.longestStreak || 0, streak.currentStreak);
  streak.totalCommits = (streak.totalCommits || 0) + 1;
  streak.lastUpdated = fullTimestamp;
  streak.lastQuote = selectedQuote.quote;
  streak.lastAuthor = selectedQuote.author;
  streak.lastCategory = selectedQuote.category;
  streak.lastSource = selectedQuote.source;
  if (!streak.startDate) streak.startDate = dateStr;

  const milestone = getMilestoneInfo(streak.currentStreak);
  streak.currentTier = milestone.title;
  streak.nextGoal = milestone.nextGoal;

  fs.writeFileSync(STREAK_PATH, JSON.stringify(streak, null, 2), 'utf8');

  // Update ACTIVITY.md
  if (!fs.existsSync(ACTIVITY_PATH)) {
    const activityHeader = `# 📊 Automated Commit & Activity Journal\n\n| Date (UTC) | Day # | Dev Quote & Wisdom | Author | Category / Source |\n| :--- | :---: | :--- | :--- | :--- |\n`;
    fs.writeFileSync(ACTIVITY_PATH, activityHeader, 'utf8');
  } else {
    // Check if header needs category/source column upgrade
    let activityContent = fs.readFileSync(ACTIVITY_PATH, 'utf8');
    if (!activityContent.includes('Category / Source')) {
      activityContent = activityContent.replace(
        '| Date (UTC) | Day # | Dev Quote & Wisdom | Author |\n| :--- | :---: | :--- | :--- |\n',
        '| Date (UTC) | Day # | Dev Quote & Wisdom | Author | Category / Source |\n| :--- | :---: | :--- | :--- | :--- |\n'
      );
      fs.writeFileSync(ACTIVITY_PATH, activityContent, 'utf8');
    }
  }

  const sanitizedQuote = selectedQuote.quote.replace(/\|/g, '\\|');
  const activityRow = `| \`${fullTimestamp}\` | **Day ${streak.currentStreak}** | _"${sanitizedQuote}"_ | **${selectedQuote.author}** | \`${selectedQuote.category}\` (${selectedQuote.source}) |\n`;
  fs.appendFileSync(ACTIVITY_PATH, activityRow, 'utf8');

  // Update README.md dynamic dashboard
  if (fs.existsSync(README_PATH)) {
    let readme = fs.readFileSync(README_PATH, 'utf8');
    const startTag = '<!-- DAILY-STATS:START -->';
    const endTag = '<!-- DAILY-STATS:END -->';

    const streakLabel = streak.currentStreak === 1 ? '1 Day' : `${streak.currentStreak} Days`;
    const longestLabel = streak.longestStreak === 1 ? '1 Day' : `${streak.longestStreak} Days`;
    const commitsLabel = streak.totalCommits === 1 ? '1 Commit' : `${streak.totalCommits} Automated`;
    const progressBar = renderProgressBar(milestone.percentage);

    const statsBlock = `${startTag}
<div align="center">

[![Daily Streak](https://img.shields.io/badge/Streak-${streak.currentStreak}_Days-orange?style=flat&logo=flame)](#-live-streak-dashboard)
[![Longest Streak](https://img.shields.io/badge/Best_Streak-${streak.longestStreak}_Days-gold?style=flat&logo=trophy)](#-live-streak-dashboard)
[![Total Commits](https://img.shields.io/badge/Total_Commits-${streak.totalCommits}-blue?style=flat&logo=git)](#-live-streak-dashboard)
[![Tier](https://img.shields.io/badge/Tier-${encodeURIComponent(milestone.title)}-purple?style=flat)](#-live-streak-dashboard)

| 🔥 Current Streak | 🏆 Longest Streak | 🚀 Total Commits | 🎯 Current Tier | 📅 Last Updated |
| :---: | :---: | :---: | :---: | :---: |
| **${streakLabel}** | **${longestLabel}** | **${commitsLabel}** | **${milestone.title}** | **${fullTimestamp}** |

<br/>

**🎯 Next Milestone (${milestone.progressText})**  
${progressBar}

<br/>

> 💡 **Wisdom Chronicle (${selectedQuote.category})**  
> 💬 _"${selectedQuote.quote}"_  
> — **${selectedQuote.author}**  
> <small>Source: ${selectedQuote.source}</small>

</div>
${endTag}`;

    if (readme.includes(startTag) && readme.includes(endTag)) {
      const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`);
      readme = readme.replace(regex, statsBlock);
      fs.writeFileSync(README_PATH, readme, 'utf8');
    }
  }

  console.log(`[SUCCESS] Auto-commit logged: Day ${streak.currentStreak} (Best: ${streak.longestStreak} Days, Total: ${streak.totalCommits} Commits)`);
  console.log(`[MILESTONE] ${milestone.title} - Progress: ${milestone.percentage}% (${milestone.progressText})`);
  console.log(`[QUOTE] "${selectedQuote.quote}" — ${selectedQuote.author} [${selectedQuote.source}]`);
}

run();
