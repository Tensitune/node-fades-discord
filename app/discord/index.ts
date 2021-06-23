import { Container } from "@/app/Container";
import { GatewayServer, SlashCommand, SlashCreator } from "slash-create";
import { Service } from "../services";

import { SlashNewsRoleCommand } from "./commands/NewsRoleCommand";

import { join } from "path";
import fs from "fs";

import Discord from "discord.js";
import fetch from "node-fetch";

export class DiscordBot extends Service {
  name = "DiscordBot";
  config = require(join(process.cwd(), "discord.json"));
  discord: Discord.Client = new Discord.Client({
    partials: ["MESSAGE", "CHANNEL", "REACTION"],
    fetchAllMembers: false,
  });

  constructor(container: Container) {
    super(container);

    const creator = new SlashCreator({
      applicationID: this.config.applicationId,
      publicKey: this.config.publicKey,
      token: this.config.token,
    });

    creator.withServer(
      new GatewayServer(handler =>
        this.discord.ws.on("INTERACTION_CREATE" as Discord.WSEventType, handler)
      )
    );

    const cmds: Array<SlashCommand> = [new SlashNewsRoleCommand(this, creator)];
    for (const slashCmd of cmds) {
      creator.registerCommand(slashCmd);
    }

    this.discord.on("ready", async () => {
      console.log(`Бот запущен как ${this.discord.user.tag}`);
      await this.setStatus("fades.pw", "WATCHING");

      creator.syncCommands();

      if (this.config.logs.enabled) {
        const logsChannel = await this.getGuildTextChannel(this.config.logs.channelId);
        if (logsChannel) {
          const embed = new Discord.MessageEmbed()
            .setTitle(`⚙️ Бот успешно запущен`)
            .setFooter(this.container.getCurrentDateTime())
            .setColor("#7447D1");

          await logsChannel.send(embed);
        }
      }

      if (this.config.commits.sbox.enabled) {
        const commitsWebhook = new Discord.WebhookClient(
          this.config.commits.sbox.webhook.id,
          this.config.commits.sbox.webhook.token
        );

        setInterval(() => {
          const commitsPath = join(process.cwd(), "commits.json");

          let commits = { sbox: [] };
          if (fs.existsSync(commitsPath)) {
            commits = require(commitsPath);
          }

          fetch("https://commits.facepunch.com/r/sbox?format=json")
            .then(res => {
              if (!res.ok) throw Error(res.statusText);
              return res;
            })
            .then(res => {
              return res.json();
            })
            .then(data => {
              const commitsData = data.results;
              for (let i = commitsData.length - 1; i >= 0; i--) {
                const commit = commitsData[i];
                if (commits.sbox.includes(commit.id)) continue;

                let message = commit.message + "\n";
                message += `- [${
                  commit.user.name
                }](<https://commits.facepunch.com/${commit.user.name.replace(/\s+/g, "")}>) on `;
                message += `[${commit.repo}](<https://commits.facepunch.com/r/${commit.repo}>)/`;
                message += `[${commit.branch}](<https://commits.facepunch.com/r/${commit.repo}/${commit.branch}>)`;
                message += ` ([#${commit.changeset}](<https://commits.facepunch.com/${commit.id}>))`;

                commitsWebhook.send(message, {
                  username: commit.user.name,
                  avatarURL: commit.user.avatar,
                });
              }

              const tempCommits = [];
              for (let i = 0; i < commitsData.length; i++) {
                const commit = commitsData[i];
                tempCommits[i] = commit.id;
              }

              if (commits.sbox !== tempCommits) {
                commits.sbox = tempCommits;
                fs.writeFile(commitsPath, JSON.stringify(commits), err => {
                  if (err) console.error(err);
                });
              }
            })
            .catch(console.error);
        }, 30000);
      }
    });

    this.discord.on("guildMemberAdd", async member => {
      const membersChannel = await this.getGuildVoiceChannel(this.config.membersChannelId);
      if (membersChannel) await membersChannel.setName(`Участники: ${member.guild.memberCount}`);

      if (this.config.logs.enabled) {
        const logsChannel = await this.getGuildTextChannel(this.config.logs.channelId);
        if (logsChannel) {
          const createdAt = new Date(member.user.createdTimestamp).toLocaleString("ru", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
          });

          let description = `Присоединился к **${member.guild.name}**\n`;
          description += `Теперь на сервере **${member.guild.memberCount}** участников.\n\n`;
          description += `Дата регистрации **${createdAt}**`;

          const embed = new Discord.MessageEmbed()
            .setTitle(member.user.tag)
            .setDescription(description)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter(this.container.getCurrentDateTime())
            .setColor("#7AEB7A");

          await logsChannel.send(embed);
        }
      }
    });

    this.discord.on("guildMemberRemove", async member => {
      const membersChannel = await this.getGuildVoiceChannel(this.config.membersChannelId);
      if (membersChannel) await membersChannel.setName(`Участники: ${member.guild.memberCount}`);

      if (this.config.logs.enabled) {
        const logsChannel = await this.getGuildTextChannel(this.config.logs.channelId);
        if (logsChannel) {
          let description = `Покинул **${member.guild.name}**\n`;
          description += `Теперь на сервере **${member.guild.memberCount}** участников.`;

          const embed = new Discord.MessageEmbed()
            .setTitle(member.user.tag)
            .setDescription(description)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter(this.container.getCurrentDateTime())
            .setColor("#FFE148");

          await logsChannel.send(embed);
        }
      }
    });

    this.discord.on("messageReactionAdd", async (reaction, reactionUser) => {
      if (reactionUser.bot) return;
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (err) {
          console.error(err);
          return;
        }
      }

      if (this.config.newsRole.messageId !== reaction.message.id) return;

      for (const role of this.config.newsRole.roles) {
        if (reaction.emoji.id === role.emoji || reaction.emoji.name === role.emoji) {
          const guild = await this.discord.guilds.resolve(this.config.guildId)?.fetch();
          if (!guild) break;

          const guildRole = guild.roles.resolve(role.id);
          if (!guildRole) continue;

          const user = await guild.members.resolve(reactionUser.id).fetch();

          await user.roles.add(guildRole.id);
          await user.send(`:white_check_mark: Вы получили роль ${guildRole.name} (${role.title})`);

          break;
        }
      }
    });

    this.discord.on("messageReactionRemove", async (reaction, reactionUser) => {
      if (reactionUser.bot) return;
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (err) {
          console.error(err);
          return;
        }
      }

      if (this.config.newsRole.messageId !== reaction.message.id) return;

      for (const role of this.config.newsRole.roles) {
        if (reaction.emoji.id === role.emoji || reaction.emoji.name === role.emoji) {
          const guild = await this.discord.guilds.resolve(this.config.guildId)?.fetch();
          if (!guild) break;

          const guildRole = guild.roles.resolve(role.id);
          if (!guildRole) continue;

          const user = await guild.members.resolve(reactionUser.id).fetch();

          await user.roles.remove(guildRole.id);
          await user.send(`:x: Вы сняли с себя роль ${guildRole.name} (${role.title})`);

          break;
        }
      }
    });

    this.discord.login(this.config.token);
  }

  public async getGuildTextChannel(channelId: string): Promise<Discord.TextChannel> {
    const guild = await this.discord.guilds.resolve(this.config.guildId)?.fetch();
    if (!guild) return;

    const channel = (await guild.channels.resolve(channelId)?.fetch()) as Discord.TextChannel;
    return channel;
  }

  private async getGuildVoiceChannel(channelId: string): Promise<Discord.VoiceChannel> {
    const guild = await this.discord.guilds.resolve(this.config.guildId)?.fetch();
    if (!guild) return;

    const channel = (await guild.channels.resolve(channelId)?.fetch()) as Discord.VoiceChannel;
    return channel;
  }

  private async setStatus(
    status: string,
    type: number | Discord.ActivityType = "PLAYING"
  ): Promise<void> {
    if (status.length > 127) status = status.substring(0, 120) + "...";

    await this.discord.user.setPresence({
      activity: {
        name: status.trim().substring(0, 100),
        type,
      },
      status: "online",
    });
  }
}

export default (container: Container): Service => {
  return new DiscordBot(container);
};
