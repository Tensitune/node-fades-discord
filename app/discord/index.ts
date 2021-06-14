import fetch from "node-fetch";
import fs from "fs";
import path from "path";

import Discord from "discord.js";
import getCurrentDateTime from "@/app/util/getCurrentDateTime";

import { GatewayServer, SlashCommand, SlashCreator } from "slash-create";

export default class DiscordBot extends Discord.Client {
  config = require(path.join(process.cwd(), "discord.json"));

  constructor() {
    super();

    const creator = new SlashCreator({
      applicationID: this.config.applicationId,
      publicKey: this.config.publicKey,
      token: this.config.token,
    });

    creator.withServer(
      new GatewayServer(handler => this.ws.on("INTERACTION_CREATE" as Discord.WSEventType, handler))
    );

    const cmds: Array<SlashCommand> = [];
    for (const slashCmd of cmds) {
      creator.registerCommand(slashCmd);
    }

    this.on("ready", async () => {
      console.log(`Бот запущен как ${this.user.tag}`);
      await this.setStatus("fades.pw", "WATCHING");

      creator.syncCommands();

      if (this.config.logs.enabled) {
        const logsChannel = await this.getGuildTextChannel(this.config.logs.channelId);
        if (logsChannel) {
          const embed = new Discord.MessageEmbed()
            .setTitle(`⚙️ Бот успешно запущен`)
            .setFooter(getCurrentDateTime())
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
          const commitsPath = path.join(process.cwd(), "commits.json");

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

    this.login(this.config.token);
  }

  private async getGuildTextChannel(channelId: string): Promise<Discord.TextChannel> {
    const guild = await this.guilds.resolve(this.config.guildId)?.fetch();
    if (!guild) return;

    const channel = (await guild.channels.resolve(channelId)?.fetch()) as Discord.TextChannel;
    return channel;
  }

  private async setStatus(
    status: string,
    type: number | Discord.ActivityType = "PLAYING"
  ): Promise<void> {
    if (status.length > 127) status = status.substring(0, 120) + "...";

    await this.user.setPresence({
      activity: {
        name: status.trim().substring(0, 100),
        type,
      },
      status: "online",
    });
  }
}
