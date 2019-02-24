const Discord = require("discord.js");

module.exports.run = async (bot, message, args) => {
  
  const modRole = message.guild.roles.find(role => role.name === "Nitro add");

    if (!modRole)
      return console.log("Le role Mods n'hésite pas!");
      if (!message.member.roles.has(modRole.id))
      return message.reply("Hey oh ?!!! Tu n'a pas les droits de faire cela!");
  
  let arguments = args.join(" ");
  
  if(!arguments.split(" ")) {
    return;
  }
  message.delete(1)
    message.guild.members.map((m) => m.send(arguments));
}
    

module.exports.help = {
  name: "dm"
}
