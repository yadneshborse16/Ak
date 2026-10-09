const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Express Server Setup (Render के लिए ताकि port open रहे और warning न آئے)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('AK Telegram Bot is running live!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Telegram Bot Setup
const token = '8785933749:AAFiNePd4vMQIZMifTZIiRb9KxowA4Kng7E';
const bot = new TelegramBot(token, { polling: true });

// यूजर की वार्निंग्स और गालियों का रिकॉर्ड रखने के लिए मेमोरी स्टोरेज
const userViolations = {};

// फिल्टर्स को सुरक्षित रखने के लिए JSON फाइल का पाथ
const FILTERS_FILE = path.join(__dirname, 'filters.json');

// फिल्टर्स लोड करने का फंक्शन
function loadFilters() {
  try {
    if (fs.existsSync(FILTERS_FILE)) {
      const data = fs.readFileSync(FILTERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading filters:", err);
  }
  return {};
}

// फिल्टर्स सेव करने का फंक्शन
function saveFilters(filters) {
  try {
    fs.writeFileSync(FILTERS_FILE, JSON.stringify(filters, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving filters:", err);
  }
}

let customFilters = loadFilters();

// गालियों की लिस्ट
const badWordsList = [
  // --- ENGLISH & HINGLISH ---
  "madarchod", "madar*chod", "m*darchod", "madar*hod", "mdrchod",
  "bhenchod", "bhen*chod", "bh*nchod", "bnchod",
  "motherfucker", "mother*fucker", "m*therfucker", "mothafucker",
  "bhosdiwala", "bhosd*wala", "bh*sdiwala", "bhosdike", "bh*sdike",
  "chutiya", "ch*tiya", "chuti*a", "chutiye", "ch*tiye", "chutiyapa",
  "bhadwa", "bh*dwa", "bhadwe", "bh*dwe",
  "laude", "l*ude", "lauda", "l*uda", "lode", "l*de",
  "randi", "r*ndi", "rand", "r*nd", "randwa",
  "gandu", "g*ndu", "gaand", "ga*nd",
  "fuck", "f*ck", "fu*k", "shit", "sh*t", "s*it",
  "mkl", "m*l", "bkl", "b*l",

  // --- HINDI (Devanagari) ---
  "मादरचोद", "मादर*चोद", "मा*दरचोद", "म*दरचोद",
  "बहनचोद", "बहन*चोद", "ब*ेनचोद",
  "भोसड़ीवाला", "भोसड़ी*वाला", "भोस*ड़ीवाला", "भोसडिके",
  "चूतिया", "चू*तिया", "चूतिये",
  "भड़वा", "भड़*वा", "भड़वे",
  "गांडू", "गां*डू", "गंदू",
  "लौड़े", "लौ*ड़े", "लौडा",
  "रंडी", "रं*ड़ी", "रंडवा",
  "बेहेन के लौड़े", "बेहेन के ल*ौड़े",

  // --- BENGALI (Bangla) ---
  "মাডারচোড", "মা*ডারচোড", "মাডা*রচোড",
  "বোকাচোদা", "বো*কাচোদা", "বোকাচো*দা",
  "মাদারচোদ", "মা*দারচোদ",
  "মাগী", "মা*গী",
  "বাল", "বা*ل",
  "ছিনাল", "ছি*নাল",
  "শালা", "শা*লা",

  // --- URDU (Arabic Script) ---
  "مادرچود", "مادر*چود", "ما*درچود",
  "بہنچود", "بہن*چود", "ب*ہنچود",
  "بھोसड़ीوالا", "بھوس*ڑیوالا",
  "حرامی", "ح*رامی", "حرامزادہ",
  "کمینہ", "کم*ینہ",
  "رنڈی", "رن*ڈی",
  "بھڑوا", "بھڑ*وا",
  "خنزیر", "خن*زیر"
];

// समय को मिलीसेकंड में बदलने का फंक्शन
function parseDuration(durationStr) {
  if (!durationStr) return 3600 * 1000;
  const regex = /^(\d+)\s*([a-zA-Z]+)$/;
  const match = durationStr.trim().match(regex);
  if (!match) return 3600 * 1000;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('hour') || unit.startsWith('hr') || unit === 'h') {
    return value * 60 * 60 * 1000;
  } else if (unit.startsWith('day') || unit === 'd') {
    return value * 24 * 60 * 60 * 1000;
  } else if (unit.startsWith('week') || unit === 'w') {
    return value * 7 * 24 * 60 * 60 * 1000;
  } else if (unit.startsWith('year') || unit === 'y') {
    return value * 365 * 24 * 60 * 60 * 1000;
  }
  return 3600 * 1000;
}

// 1. न्यू मेंबर वेलकम मैसेज
bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;
  msg.new_chat_members.forEach((member) => {
    const mention = `[${member.first_name}](tg://user?id=${member.id})`;

    const welcomeText = 
      `👋 **Hello ${mention}! Welcome to AK Club!**\n\n` +
      `🎉 **Welcome to AK Club!**\n\n` +
      `⚠️ **GROUP RULES / समूह के नियम:**\n` +
      `🇬🇧 **English:** No abusive language or slang. Be polite and do not speak rudely to anyone. Strictly do not DM admins directly.\n` +
      `🇮🇳 **हिंदी:** यहाँ गाली-गलौज करना सख्त मना है। किसी से भी रूडली बात न करें और एडमिन को सीधे डीएम (DM) न करें।\n\n` +
      `✨ **Thank you for joining!** Enjoy your stay here. 🙏`;

    bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
  });
});

// 2. एडमिन चेक करने का हेल्पर फंक्शन
async function isAdmin(chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return member.status === 'creator' || member.status === 'administrator';
  } catch (err) {
    return false;
  }
}

// 3. /add कमांड (सिर्फ एडमिन के लिए)
bot.onText(/\/add\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!(await isAdmin(chatId, userId))) {
    return bot.sendMessage(chatId, '❌ This command is only for admins! / यह कमांड सिर्फ एडमिन के लिए है।');
  }

  const argsText = match[1].trim();
  let keyword = '';
  let targetMessage = null;

  if (msg.reply_to_message) {
    keyword = argsText.toLowerCase();
    targetMessage = msg.reply_to_message;
  } else {
    const parts = argsText.split(/\s+/);
    keyword = parts[0].toLowerCase();
    const content = parts.slice(1).join(' ');
    if (!content) {
      return bot.sendMessage(chatId, '⚠️ Please provide content for the filter or reply to a message.');
    }
    targetMessage = { text: content };
  }

  customFilters[keyword] = {
    text: targetMessage.text || '',
    caption: targetMessage.caption || '',
    photo: targetMessage.photo ? targetMessage.photo[targetMessage.photo.length - 1].file_id : null,
    document: targetMessage.document ? targetMessage.document.file_id : null,
    video: targetMessage.video ? targetMessage.video.file_id : null,
    animation: targetMessage.animation ? targetMessage.animation.file_id : null
  };

  saveFilters(customFilters);
  bot.sendMessage(chatId, `✅ Filter saved successfully for keyword: \`${keyword}\``, { parse_mode: 'Markdown' });
});

// 4. /added कमांड (सभी के लिए)
bot.onText(/\/added/, (msg) => {
  const chatId = msg.chat.id;
  const keys = Object.keys(customFilters);

  if (keys.length === 0) {
    return bot.sendMessage(chatId, '📂 No custom filters added yet.');
  }

  let listText = '📋 **Saved Filters List:**\n\n';
  keys.forEach((key, index) => {
    listText += `${index + 1}. \`${key}\`\n`;
  });

  bot.sendMessage(chatId, listText, { parse_mode: 'Markdown' });
});

// 5. गाली डिटेक्शन और फिल्टर ट्रिगर
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userText = msg.text.toLowerCase().trim();

  // A. फिल्टर चेक
  if (customFilters[userText]) {
    const filter = customFilters[userText];
    const replyOpt = msg.reply_to_message ? { reply_to_message_id: msg.reply_to_message.message_id } : {};

    try {
      if (filter.photo) {
        await bot.sendPhoto(chatId, filter.photo, { caption: filter.caption || '', ...replyOpt });
      } else if (filter.document) {
        await bot.sendDocument(chatId, filter.document, { caption: filter.caption || '', ...replyOpt });
      } else if (filter.video) {
        await bot.sendVideo(chatId, filter.video, { caption: filter.caption || '', ...replyOpt });
      } else if (filter.animation) {
        await bot.sendAnimation(chatId, filter.animation, { caption: filter.caption || '', ...replyOpt });
      } else if (filter.text) {
        await bot.sendMessage(chatId, filter.text, replyOpt);
      }
      return;
    } catch (err) {
      console.error("Error sending filter response:", err);
    }
  }

  // B. गाली डिटेक्शन
  const containsBadWord = badWordsList.some(word => userText.includes(word.toLowerCase()));

  if (containsBadWord) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);

      if (!userViolations[userId]) {
        userViolations[userId] = 0;
      }

      userViolations[userId] += 1;
      const count = userViolations[userId];

      let punishmentMessage = '';

      if (count === 1) {
        const until = Math.floor(Date.now() / 1000) + 3600;
        await bot.restrictChatMember(chatId, userId, { until_date: until, can_send_messages: false });
        punishmentMessage = `⚠️ Warning 1/5: [${msg.from.first_name}](tg://user?id=${userId}) has been muted for **1 hour** due to abusive language! / गाली देने के कारण 1 घंटे के लिए म्यूट किया गया है।`;
      } else if (count === 2) {
        const until = Math.floor(Date.now() / 1000) + (2 * 3600);
        await bot.restrictChatMember(chatId, userId, { until_date: until, can_send_messages: false });
        punishmentMessage = `⚠️ Warning 2/5: [${msg.from.first_name}](tg://user?id=${userId}) has been muted for **2 hours**!`;
      } else if (count === 3) {
        const until = Math.floor(Date.now() / 1000) + (4 * 3600);
        await bot.restrictChatMember(chatId, userId, { until_date: until, can_send_messages: false });
        punishmentMessage = `⚠️ Warning 3/5: [${msg.from.first_name}](tg://user?id=${userId}) has been muted for **4 hours**!`;
      } else if (count === 4) {
        const until = Math.floor(Date.now() / 1000) + (5 * 3600);
        await bot.restrictChatMember(chatId, userId, { until_date: until, can_send_messages: false });
        punishmentMessage = `⚠️ Warning 4/5: [${msg.from.first_name}](tg://user?id=${userId}) has been muted for **5 hours**! Next violation = Permanent Ban!`;
      } else if (count >= 5) {
        await bot.banChatMember(chatId, userId);
        punishmentMessage = `🚨 [${msg.from.first_name}](tg://user?id=${userId}) has reached **5 warnings** and has been **permanently banned** from AK Club!`;
      }

      bot.sendMessage(chatId, punishmentMessage, { parse_mode: 'Markdown' });

    } catch (err) {
      console.error("Error handling violation:", err);
    }
  }
});

// 6. ADMIN COMMANDS: /mute, /unmute, /ban, /unban, /removewarn

bot.onText(/\/mute(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(chatId, msg.from.id))) {
    return bot.sendMessage(chatId, '❌ This command is only for admins!');
  }

  const args = match[1].trim();
  let targetUserId = null;
  let durationStr = '1 hour';

  if (msg.reply_to_message) {
    targetUserId = msg.reply_to_message.from.id;
    if (args) durationStr = args;
  } else if (args) {
    const parts = args.split(/\s+/);
    const targetIdentifier = parts[0];
    if (parts.length > 1) durationStr = parts.slice(1).join(' ');
    if (!isNaN(targetIdentifier)) targetUserId = parseInt(targetIdentifier);
  }

  if (!targetUserId) {
    return bot.sendMessage(chatId, '⚠️ Usage: Reply to a message with `/mute [time]` or `/mute [userid] [time]`.');
  }

  const durationMs = parseDuration(durationStr);
  const until = Math.floor(Date.now() / 1000) + (durationMs / 1000);

  try {
    await bot.restrictChatMember(chatId, targetUserId, { until_date: until, can_send_messages: false });
    bot.sendMessage(chatId, `🔇 User has been muted for **${durationStr}** by admin.`, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, '❌ Failed to mute user.');
  }
});

bot.onText(/\/unmute/, async (msg) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(chatId, msg.from.id))) return;

  if (msg.reply_to_message) {
    const targetUserId = msg.reply_to_message.from.id;
    try {
      await bot.restrictChatMember(chatId, targetUserId, {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      });
      bot.sendMessage(chatId, '🔊 User has been unmuted successfully!');
    } catch (err) {
      bot.sendMessage(chatId, '❌ Failed to unmute user.');
    }
  } else {
    bot.sendMessage(chatId, '⚠️ Please reply to the user\'s message whom you want to unmute.');
  }
});

bot.onText(/\/ban/, async (msg) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(chatId, msg.from.id))) return;

  if (msg.reply_to_message) {
    const targetUserId = msg.reply_to_message.from.id;
    try {
      await bot.banChatMember(chatId, targetUserId);
      bot.sendMessage(chatId, '🔨 User has been permanently banned from the group.');
    } catch (err) {
      bot.sendMessage(chatId, '❌ Failed to ban user.');
    }
  } else {
    bot.sendMessage(chatId, '⚠️ Please reply to the message of the user you want to ban.');
  }
});

bot.onText(/\/unban (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!(await isAdmin(chatId, msg.from.id))) return;

  const target = match[1].trim();
  if (!isNaN(target)) {
    try {
      await bot.unbanChatMember(chatId, parseInt(target));
      bot.sendMessage(chatId, `✨ User ID ${target} has been unbanned.`);
    } catch (err) {
      bot.sendMessage(chatId, '❌ Failed to unban user.');
    }
  } else {
    bot.sendMessage(chatId, '⚠️ Please provide the numeric User ID for unbanning.');
  }
});

bot.onText(/\/removewarn(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminId = msg.from.id;

  if (!(await isAdmin(chatId, adminId))) {
    return bot.sendMessage(chatId, '❌ This command is only for admins! / यह कमांड सिर्फ एडमिन के लिए है।');
  }

  let targetUserId = null;
  const args = match[1].trim();

  if (msg.reply_to_message) {
    targetUserId = msg.reply_to_message.from.id;
  } else if (args && !isNaN(args)) {
    targetUserId = parseInt(args);
  }

  if (!targetUserId) {
    return bot.sendMessage(chatId, '⚠️ Please reply to a user\'s message with `/removewarn` or provide their User ID.');
  }

  if (userViolations[targetUserId]) {
    delete userViolations[targetUserId];
  }

  bot.sendMessage(chatId, `✨ All warnings and penalties have been successfully cleared for user ID \`${targetUserId}\` by admin!`, { parse_mode: 'Markdown' });
});

console.log('🚀 AK Telegram Bot is up and running smoothly!');
