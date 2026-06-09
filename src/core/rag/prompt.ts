import { appConfig } from "@/config/app.config";

export function systemPrompt(): string {
  return appConfig.systemPrompt;
}
