export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.TTN_NO_SCHEDULER !== "1") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
