import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }
  
  if (bootPromise) {
    return bootPromise;
  }

  console.log("Booting WebContainer micro-os...");
  bootPromise = WebContainer.boot().then(instance => {
    webcontainerInstance = instance;
    console.log("WebContainer booted successfully!");
    return instance;
  });

  return bootPromise;
}
