import {
  ApplicationCommandPermissionType,
  CommandContext,
  SlashCommand,
  SlashCreator,
} from "slash-create";
import { DiscordBot } from "..";
import { MessageEmbed } from "discord.js";
import { join } from "path";
import { writeFile } from "fs";

export class SlashNewsRoleCommand extends SlashCommand {
  private bot: DiscordBot;

  constructor(bot: DiscordBot, creator: SlashCreator) {
    super(creator, {
      name: "newsrole",
      description: "Команда, вызывающая табличку с выдачей ролей на оповещения с новостями.",
      deferEphemeral: true,
      guildIDs: [bot.config.guildId],
      permissions: {
        [bot.config.guildId]: [
          {
            type: ApplicationCommandPermissionType.ROLE,
            id: bot.config.devRoleId,
            permission: true,
          },
        ],
      },
      options: [],
    });
    this.filePath = __filename;
    this.bot = bot;
  }

  async run(ctx: CommandContext): Promise<any> {
    await ctx.defer();

    try {
      const embed = new MessageEmbed().setColor("#556DC8");

      let messageText = "Приветствую на нашем сервере, на этом канале Вы можете получить/снять ";
      messageText += "роли, благодаря которым будете получать оповещения с новостями.";
      messageText += "\nНажмите на эмодзи с интересующей Вас темой.";

      let description = "";
      for (const role of this.bot.config.newsRole.roles) {
        if (role.emoji.match(/\d+/)) {
          const guild = await this.bot.discord.guilds.resolve(this.bot.config.guildId)?.fetch();
          if (!guild) continue;

          const emoji = guild.emojis.resolve(role.emoji);
          if (!emoji) continue;

          description += `<:${emoji.name}:${emoji.id}> — ${role.title}\n`;
        } else {
          description += `${role.emoji} — ${role.title}\n`;
        }
      }

      embed.setDescription(description);

      const channel = await this.bot.getGuildTextChannel(ctx.channelID);
      await ctx.delete();

      const message = await channel.send(messageText, { embed });
      this.bot.config.newsRole.messageId = message.id;

      writeFile(
        join(process.cwd(), "discord.json"),
        JSON.stringify(this.bot.config, null, "\t"),
        err => {
          if (err) console.error(err);
        }
      );

      for (const role of this.bot.config.newsRole.roles) {
        await message.react(role.emoji);
      }
    } catch (err) {
      const errMsg = (err as Error)?.message ?? err;
      await ctx.send(errMsg);
    }
  }
}
