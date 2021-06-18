import {
  ApplicationCommandPermissionType,
  ButtonStyle,
  CommandContext,
  ComponentType,
  SlashCommand,
  SlashCreator,
} from "slash-create";
import DiscordBot from "..";

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
    try {
      await ctx.defer();

      let message = "Приветствую на нашем сервере, на этом канале Вы можете получить/снять роли, ";
      message += "благодаря которым будете получать оповещения с новостями.";
      message += "\nНажмите на кнопку с интересующей Вас темой.";

      const buttons = [];
      for (const button of this.bot.config.newsRoles) {
        const emoji: { id?: string; name?: string } = {};

        if (button.emoji.match(/\d+/)) emoji.id = button.emoji;
        else emoji.name = button.emoji;

        buttons.push({
          type: ComponentType.BUTTON,
          style: ButtonStyle.PRIMARY,
          label: button.title,
          custom_id: `${button.roleId}_${button.title.replace(/\s+/g, "_")}`,
          emoji,
        });
      }

      await ctx.send(message, {
        components: [
          {
            type: ComponentType.ACTION_ROW,
            components: buttons,
          },
        ],
      });
    } catch (err) {
      const errMsg = (err as Error)?.message ?? err;
      await ctx.send(errMsg);
    }
  }
}
