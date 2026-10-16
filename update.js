const fs = require('fs');
const path = require('path');

const STREAK_PATH = path.join(__dirname, 'streak.json');
const QUOTES_PATH = path.join(__dirname, 'quotes.json');
const ACTIVITY_PATH = path.join(__dirname, 'ACTIVITY.md');
const README_PATH = path.join(__dirname, 'README.md');

function run() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0] + ' UTC';
  const fullTimestamp = `${dateStr} ${timeStr}`;

  // Read streak data
  let streak = {
    currentStreak: 0,
    totalCommits: 0,
    startDate: dateStr,
    lastUpdated: null,
    lastQuote: null,
  };

  if (fs.existsSync(STREAK_PATH)) {
    try {
      streak = JSON.parse(fs.readFileSync(STREAK_PATH, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse streak.json, creating a new one.');
    }
  }

  // Load quotes
  let quotes = [];
  if (fs.existsSync(QUOTES_PATH)) {
    try {
      quotes = JSON.parse(fs.readFileSync(QUOTES_PATH, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse quotes.json.');
    }
  }

  if (!quotes || quotes.length === 0) {
    quotes = [{ quote: 'Consistency is what transforms average into excellence.', author: 'Anonymous' }];
  }

  // Pick a random quote that isn't the immediate last quote (if possible)
  const candidateQuotes = quotes.filter(q => q.quote !== streak.lastQuote);
  const selectedQuote = (candidateQuotes.length > 0 ? candidateQuotes : quotes)[
    Math.floor(Math.random() * (candidateQuotes.length > 0 ? candidateQuotes.length : quotes.length))
  ];

  // Update counters
  streak.currentStreak = (streak.currentStreak || 0) + 1;
  streak.totalCommits = (streak.totalCommits || 0) + 1;
  streak.lastUpdated = fullTimestamp;
  streak.lastQuote = selectedQuote.quote;
  if (!streak.startDate) streak.startDate = dateStr;

  fs.writeFileSync(STREAK_PATH, JSON.stringify(streak, null, 2), 'utf8');

  // Update ACTIVITY.md
  if (!fs.existsSync(ACTIVITY_PATH)) {
    const activityHeader = `# 📊 Automated Daily Commit Activity Log\n\n| Date (UTC) | Day # | Dev Quote & Wisdom | Author |\n| :--- | :---: | :--- | :--- |\n`;
    fs.writeFileSync(ACTIVITY_PATH, activityHeader, 'utf8');
  }

  const sanitizedQuote = selectedQuote.quote.replace(/\|/g, '\\|');
  const activityRow = `| \`${fullTimestamp}\` | **Day ${streak.currentStreak}** | _"${sanitizedQuote}"_ | **${selectedQuote.author}** |\n`;
  fs.appendFileSync(ACTIVITY_PATH, activityRow, 'utf8');

  // Update README.md dynamic section
  if (fs.existsSync(README_PATH)) {
    let readme = fs.readFileSync(README_PATH, 'utf8');
    const startTag = '<!-- DAILY-STATS:START -->';
    const endTag = '<!-- DAILY-STATS:END -->';

    const streakLabel = streak.currentStreak === 1 ? '1 Day' : `${streak.currentStreak} Days`;
    const commitsLabel = streak.totalCommits === 1 ? '1 Commit' : `${streak.totalCommits} Automated`;

    const statsBlock = `${startTag}
<div align="center">

| 🔥 Current Streak | 🚀 Total Commits | 📅 Last Updated |
| :---: | :---: | :---: |
| **${streakLabel}** | **${commitsLabel}** | **${fullTimestamp}** |

> 💬 _"${selectedQuote.quote}"_  
> — **${selectedQuote.author}**

</div>
${endTag}`;

    if (readme.includes(startTag) && readme.includes(endTag)) {
      const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`);
      readme = readme.replace(regex, statsBlock);
      fs.writeFileSync(README_PATH, readme, 'utf8');
    }
  }

  console.log(`[SUCCESS] Auto-commit logged: Day ${streak.currentStreak} (${fullTimestamp})`);
  console.log(`[QUOTE] "${selectedQuote.quote}" - ${selectedQuote.author}`);
}

run();
