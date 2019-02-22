const botconfig = require("./botconfig.json");
const token = process.env.token
const Discord = require("discord.js");
const fs = require("fs");
const bot = new Discord.Client();
bot.commands = new Discord.Collection();
let coins = require("./coins.json");
let xp = require("./xp.json");
let purple = botconfig.purple;
let cooldown = new Set();
let cdseconds = 5;

const {
  Client,
  Util
} = require('discord.js');
const {
  PREFIX,
  GOOGLE_API_KEY
} = require('./config');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');

const client = new Client({
  disableEveryone: true
});

const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

bot.on('warn', console.warn);

bot.on('error', console.error);

bot.on('ready', () => console.log('Yo this ready!'));

bot.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

bot.on('reconnecting', () => console.log('I am reconnecting now!'));

bot.on('message', async msg => { // eslint-disable-line
  if (msg.author.bot) return undefined;
  if (!msg.content.startsWith(PREFIX)) return undefined;

  const args = msg.content.split(' ');
  const searchString = args.slice(1).join(' ');
  const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
  const serverQueue = queue.get(msg.guild.id);

  let command = msg.content.toLowerCase().split(' ')[0];
  command = command.slice(PREFIX.length)

  if (command === 'p') {
    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel) return msg.channel.send('Je suis désolé mais vous devez être sur un canal vocal pour utilisé ma fonction musique!');
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has('CONNECT')) {
      return msg.channel.send('Je ne parviens pas à me connecter à votre canal vocal, assurez-vous que je dispose des autorisations appropriées!');
    }
    if (!permissions.has('SPEAK')) {
      return msg.channel.send('Je ne peux pas parler sur ce canal vocal, assurez-vous que je dispose des autorisations appropriées!');
    }

    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      const playlist = await youtube.getPlaylist(url);
      const videos = await playlist.getVideos();
      for (const video of Object.values(videos)) {
        const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
        await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
      }
      return msg.channel.send(`✅ Playlist: **${playlist.title}** à été ajouter a la queue`);
    } else {
      try {
        var video = await youtube.getVideo(url);
      } catch (error) {
        try {
          var videos = await youtube.searchVideos(searchString, 10);
          let index = 0;
          msg.channel.send(`
__**Musique en sélection**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Veuillez fournir une valeur pour sélectionner l'un des résultats de la recherche, allant de 1 à 10.
					`);
          // eslint-disable-next-line max-depth
          try {
            var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
              maxMatches: 1,
              time: 10000,
              errors: ['time']
            });
          } catch (err) {
            console.error(err);
            return msg.channel.send('Aucune valeur ou valeur invalide entrée, annulant la sélection de vidéo.');
          }
          const videoIndex = parseInt(response.first().content);
          var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
        } catch (err) {
          console.error(err);
          return msg.channel.send('🆘 Je n ai pu obtenir aucun résultat de recherche.');
        }
      }
      return handleVideo(video, msg, voiceChannel);
    }
  } else if (command === 'n') {
    if (!msg.member.voiceChannel) return msg.channel.send('Vous n êtes pas dans un canal vocal!');
    if (!serverQueue) return msg.channel.send('Il n y a rien a passer apres cette musique!');
    serverQueue.connection.dispatcher.end('Vous avez utilsé la commande skip avec succès! ');
    return undefined;
  } else if (command === 's') {
    if (!msg.member.voiceChannel) return msg.channel.send('Tu n es pas dans un canal vocal !');
    if (!serverQueue) return msg.channel.send('Il n y a aucune Musique en cours de lecture...');
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end('Vous avez utilsé la commande skip avec succès!');
    return undefined;
  } else if (command === 'v') {
    if (!msg.member.voiceChannel) return msg.channel.send('Tu n es pas dans un canal vocal !');
    if (!serverQueue) return msg.channel.send('Il n y a aucune musique en cours de lecture...');
    if (!args[1]) return msg.channel.send(`Le volume actuel est: **${serverQueue.volume}**`);
    serverQueue.volume = args[1];
    serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
    return msg.channel.send(`Je configure le volume sur: **${args[1]}**`);
  } else if (command === 'np') {
    if (!serverQueue) return msg.channel.send('Il n y a aucune Musique en cours de lecture...');
    return msg.channel.send(`🎶 En lecture: **${serverQueue.songs[0].title}**`);
  } else if (command === 'q') {
    if (!serverQueue) return msg.channel.send('Il n y a aucune musique en cours...');
    return msg.channel.send(`
__**Musique dans la liste d attente**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**En lecture:** ${serverQueue.songs[0].title}
		`);
  } else if (command === 'pause') {
    if (serverQueue && serverQueue.playing) {
      serverQueue.playing = false;
      serverQueue.connection.dispatcher.pause();
      return msg.channel.send('⏸ J ai mit la musique a pause suite a votre demande!');
    }
    return msg.channel.send('Il n y a aucune musique en cours...');
  } else if (command === 'resume') {
    if (serverQueue && !serverQueue.playing) {
      serverQueue.playing = true;
      serverQueue.connection.dispatcher.resume();
      return msg.channel.send('▶ J ai repris la musique qui étais en cours!');
    }
    return msg.channel.send('Il n y a aucune musique en cours...');
  }

  return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
  const serverQueue = queue.get(msg.guild.id);
  console.log(video);
  const song = {
    id: video.id,
    title: Util.escapeMarkdown(video.title),
    url: `https://www.youtube.com/watch?v=${video.id}`
  };
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: msg.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(msg.guild.id, queueConstruct);

    queueConstruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(msg.guild, queueConstruct.songs[0]);
    } catch (error) {
      console.error(`Je ne peut pas rejoindre le canal vocal: ${error}`);
      queue.delete(msg.guild.id);
      return msg.channel.send(`Je ne peut pas rejoindre le canal vocal: ${error}`);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    if (playlist) return undefined;
    else return msg.channel.send(`✅ **${song.title}** a été ajouter a la file d'attente`);
  }
  return undefined;
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(serverQueue.songs);

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
    .on('end', reason => {
      if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
      else console.log(reason);
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

  serverQueue.textChannel.send(`🎶 Musique en cours: **${song.title}**`);
}







fs.readdir("./commands/", (err, files) => {

  if (err) console.log(err);
  let jsfile = files.filter(f => f.split(".").pop() === "js");
  if (jsfile.length <= 0) {
    console.log("je ne trouve pas la commande.");
    return;
  }

  jsfile.forEach((f, i) => {
    let props = require(`./commands/${f}`);
    console.log(`${f} charger!`);
    bot.commands.set(props.help.name, props);
  });
});

bot.on("ready", async () => {

  console.log(`${bot.user.username} est en ligne sur ${bot.guilds.size} serveur`);
  bot.user.setActivity("tape*help", {
    type: "WATCHING"
  });

});


bot.on("message", async message => {

  if (message.author.bot) return;
  if (message.channel.type === "dm") return;

  let prefixes = JSON.parse(fs.readFileSync("./prefixes.json", "utf8"));
  if (!prefixes[message.guild.id]) {
    prefixes[message.guild.id] = {
      prefixes: botconfig.prefix
    };
  }

  if (!coins[message.author.id]) {
    coins[message.author.id] = {
      coins: 0
    };
  }

  let coinAmt = Math.floor(Math.random() * 15) + 1;
  let baseAmt = Math.floor(Math.random() * 15) + 1;
  console.log(`${coinAmt} ; ${baseAmt}`);

  if (coinAmt === baseAmt) {
    coins[message.author.id] = {
      coins: coins[message.author.id].coins + coinAmt
    };
    fs.writeFile("./coins.json", JSON.stringify(coins), (err) => {
      if (err) console.log(err)
    });
    let coinEmbed = new Discord.RichEmbed()
      .setAuthor(message.author.username)
      .setColor("#0000FF")
      .addField("💸", `${coinAmt} coins added!`);

    message.channel.send(coinEmbed).then(msg => {
      msg.delete(5000)
    });
  }

  let xpAdd = Math.floor(Math.random() * 7) + 8;
  console.log(xpAdd);

  if (!xp[message.author.id]) {
    xp[message.author.id] = {
      xp: 0,
      level: 1
    };
  }


  let curxp = xp[message.author.id].xp;
  let curlvl = xp[message.author.id].level;
  let nxtLvl = xp[message.author.id].level * 300;
  xp[message.author.id].xp = curxp + xpAdd;
  if (nxtLvl <= xp[message.author.id].xp) {
    xp[message.author.id].level = curlvl + 1;
    let lvlup = new Discord.RichEmbed()
      .setTitle("Level Up!")
      .setColor(purple)
      .addField("New Level", curlvl + 1);

    message.channel.send(lvlup).then(msg => {
      msg.delete(5000)
    });
  }
  fs.writeFile("./xp.json", JSON.stringify(xp), (err) => {
    if (err) console.log(err)
  });
  let prefix = prefixes[message.guild.id].prefixes;
  if (!message.content.startsWith(prefix)) return;
  if (cooldown.has(message.author.id)) {
    message.delete();
    return message.reply("You have to wait 5 seconds between commands.")
  }
  if (!message.member.hasPermission("ADMINISTRATOR")) {
    cooldown.add(message.author.id);
  }


  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  let args = messageArray.slice(1);

  let commandfile = bot.commands.get(cmd.slice(prefix.length));
  if (commandfile) commandfile.run(bot, message, args);

  setTimeout(() => {
    cooldown.delete(message.author.id)
  }, cdseconds * 1000)

});
bot.login(token);