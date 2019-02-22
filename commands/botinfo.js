const Discord = require("discord.js");

module.exports.run = async (bot, message, args) => {
  message.delete(1)
  let clientIcon = bot.user.displayAvatarURL; {}
  const embed = new Discord.RichEmbed()
  .setThumbnail(clientIcon) 
  .setDescription("Voici quelques informations sur moi-même et mon créateur.") 
  .addField(":tools: Mon créateur est `MrGotti#3193`","Je le remercie de m'avoir créer! :wink:")
  .addField("🗯️Dans 294 serveurs avec 3971 utilisateurs par jours :boy:","Version 1.9.0")
  .setColor('#FF0000')
  .setFooter("© 2019 - bot par MrGotti");
      
      
  message.channel.send(embed);

}

module.exports.help = {
  name:"botinfo"
}
