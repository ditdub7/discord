// index.js
const { Client, Intents, Partials, MessageEmbed } = require('discord.js');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TOKEN = process.env.TOKEN;
const URL = 'https://api.shiba99.com/batch/C4T6';
const CHECK_INTERVAL = 120000;  // Check every 120 seconds
const OFFLINE_THRESHOLD_MINUTES = 20;
const OFFLINE_THRESHOLD_MINUTES_EXTENDED = 2880; // 48 hours in minutes
const CHANNEL_ID = '1256526266316619837';

// Importing keep_alive.js
const keepAlive = require('./keep_alive.js');

// Define intents using Intents.FLAGS
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENTS
    ],
    partials: [Partials.CHANNEL]
});

let statusMessage = null;
let membersData = null;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel.isText()) { // Corrected method name to isText()
            // Check if there's an existing status message
            const messages = await channel.messages.fetch();
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            if (botMessages.size > 0) {
                statusMessage = botMessages.first();
                console.log('Old message found');
            } else {
                statusMessage = await channel.send('‎ '); // Added non-breaking space character for visibility
                console.log('No old message found, sending new');
            }
        }

        // Start checking users status
        setInterval(checkUsersStatus, CHECK_INTERVAL);
    } catch (error) {
        console.error('Error initializing bot:', error);
    }
});

async function fetchData() {
    try {
        console.log('Fetching user data');
        const response = await axios.get(URL);
        membersData = response.data;
        console.log('Data fetched:', membersData);
    } catch (error) {
        console.error('Failed to fetch data:', error);
    }
}

async function checkUsersStatus() {
    try {
        // Fetch fresh data
        await fetchData();

        if (membersData) {
            const embedMessage = formatOfflineUsers(membersData);
            console.log('Message:', embedMessage);

            if (statusMessage) {
                await statusMessage.edit({ embeds: [embedMessage] });
                console.log('Status message updated.');
            }
        }
    } catch (error) {
        console.error('Error checking users status:', error);
    }
}

function formatOfflineUsers(data) {
    const currentTime = new Date();
    let description = '';
    let offlineCount = 0;
    let websiteCount = 0;

    data.members.forEach(member => {
        const presence = member.presence;
        if (presence) {
            if (presence.userPresenceType === 1) {
                description += `🔵 **${member.userData.name}** - Website\n`;
                websiteCount++;
            } else if (presence.lastOnline) {
                const lastOnline = new Date(presence.lastOnline);
                const offlineDuration = (currentTime - lastOnline) / 60000;  // Convert ms to minutes

                if (offlineDuration > OFFLINE_THRESHOLD_MINUTES) {
                    offlineCount++;
                    if (offlineDuration > OFFLINE_THRESHOLD_MINUTES_EXTENDED) {
                        description += `🔴 **${member.userData.name}** - OFFLINE\n`;
                    } else {
                        const hours = Math.floor(offlineDuration / 60);
                        const minutes = Math.floor(offlineDuration % 60);
                        if (hours > 0) {
                            description += `🔴 **${member.userData.name}** - Offline for ${hours}h ${minutes}m\n`;
                        } else {
                            description += `🔴 **${member.userData.name}** - Offline for ${Math.floor(offlineDuration)}m\n`;
                        }
                    }
                }
            }
        }
    });

    if (description === '') {
        description = 'All users are online.';
    }

    // Add total counts
    description = `[🔴] Total offline: ${offlineCount}\n[🔵] Total on website: ${websiteCount}\n\n` + description;

    // Add last updated timestamp
    const timestamp = Math.floor(Date.now() / 1000);  // UNIX timestamp in seconds
    description += `\n*Last updated <t:${timestamp}:R>*`;

    return new MessageEmbed()
        .setTitle('C4T6 Offline Members')
        .setDescription(description)
        .setColor(0xff0000)
        .setFooter('Shiba offline checker for C4T6');
}

client.login(TOKEN);

// keep_alive.js remains unchanged
