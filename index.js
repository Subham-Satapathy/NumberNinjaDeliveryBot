const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;


// Create a bot that uses polling
const bot = new TelegramBot(TOKEN, { polling: true });

// Set up logging
console.log('Bot is running...');

let adminState = {}; // To keep track of admin's state

// Command /start handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userFirstName = msg.from.first_name;
  const welcomeMessage = `Hello ${userFirstName}, welcome to the bot!`;

  bot.sendMessage(chatId, welcomeMessage, options);
});

// Command /reply handler
bot.onText(/\/reply/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() === ADMIN_CHAT_ID) {
    adminState[chatId] = { waitingForUserId: true };
    bot.sendMessage(chatId, 'Please provide the user ID to reply to.');
  } else {
    bot.sendMessage(chatId, 'You are not authorized to use this command.');
  }
});

// Message handler
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;
  const userId = msg.from.id;
  const userName = msg.from.first_name;

  if (chatId.toString() === ADMIN_CHAT_ID) {
    if (adminState[chatId] && adminState[chatId].waitingForUserId) {
      // Admin is in the state of waiting for user ID
      if (!isNaN(userMessage)) {
        adminState[chatId].targetUserId = userMessage;
        adminState[chatId].waitingForUserId = false;
        bot.sendMessage(chatId, 'Now, please provide the message to send.');
      } else {
        bot.sendMessage(chatId, 'Invalid user ID. Please provide a valid numeric user ID.');
      }
    } else if (adminState[chatId] && !adminState[chatId].waitingForUserId && adminState[chatId].targetUserId) {
      // Admin is in the state of waiting for the message
      const targetUserId = adminState[chatId].targetUserId;
      const responseMessage = userMessage;

      bot.sendMessage(targetUserId, responseMessage)
        .then(() => {
          bot.sendMessage(chatId, 'Message sent.');
          // Clear state
          delete adminState[chatId];
        })
        .catch(error => {
          console.error('Error sending message:', error);
          bot.sendMessage(chatId, 'Failed to send message. Please check the user ID and try again.');
        });
    }
  } else {
    // Forward message to admin including chat ID formatted for easy copying
    const forwardMessage = `Message from ${userName} (${userId}):\n${userMessage}\n\nChat ID: <code>${chatId}</code>`;
    bot.sendMessage(ADMIN_CHAT_ID, forwardMessage, { parse_mode: 'HTML' })
      .catch(error => console.error('Error forwarding message:', error));
    bot.sendMessage(chatId, 'Your message has been received. We\'ll get back to you soon.')
      .catch(error => console.error('Error sending confirmation message:', error));
  }
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});
