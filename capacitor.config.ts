import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.myapp", // ← Change this to your app's bundle ID
  appName: "My App", // ← Change this to your app's name
  webDir: "dist",
  server: {
    // Uncomment for live reload during development:
    // url: "http://YOUR_LOCAL_IP:5173",
    // cleartext: true,
  },
};

export default config;
