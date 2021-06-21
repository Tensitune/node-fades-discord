import { Container } from "./Container";

export class Service {
  readonly name: string;
  container: Container;

  constructor(container: Container) {
    this.container = container;
  }
}

import DiscordProvider, { DiscordBot } from "./discord";

export default [DiscordProvider];
export { DiscordBot };

export type ServiceMap = {
  [key: string]: Service;
  DiscordBot?: DiscordBot;
};
