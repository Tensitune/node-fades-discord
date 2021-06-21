import { Container } from "./Container";
import providers from "./services";

export default class App {
  container: Container;

  constructor() {
    this.container = new Container(this, providers);
    this.init();
  }

  async init(): Promise<void> {
    const containerProviders = this.container.getProviders();

    for (const provider of containerProviders) {
      const service = provider(this.container);
      await this.container.addService(service);
    }
  }
}
