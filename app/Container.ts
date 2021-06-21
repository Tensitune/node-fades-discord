import { Service, ServiceMap } from "./services";
import App from ".";

type ProviderFactory = { (container: Container): Service | Promise<Service> }[];

export class Container {
  readonly app: App;
  private providers: ProviderFactory;
  private services: ServiceMap = {};

  constructor(app: App, providers: ProviderFactory) {
    this.app = app;
    this.providers = providers;
  }

  getCurrentDateTime(): string {
    return new Date(Date.now()).toLocaleString("ru", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  }

  getProviders(): ProviderFactory {
    return this.providers;
  }

  getServices(): ServiceMap {
    return this.services;
  }

  getService(type: string): ServiceMap[string] {
    return this.services[type];
  }

  async addService(service: Service | Promise<Service>): Promise<void> {
    if (service instanceof Promise) service = await service;
    this.services[service.name] = service;
  }
}
