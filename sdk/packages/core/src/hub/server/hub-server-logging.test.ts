import { afterEach, describe, expect, it, vi } from "vitest";
import { createHubRuntimeLogger } from "./hub-server-logging";

function parsePayload(call: unknown[]): Record<string, unknown> {
	const line = String(call[0]);
	expect(line.startsWith("[hub] ")).toBe(true);
	return JSON.parse(line.slice("[hub] ".length));
}

describe("createHubRuntimeLogger", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("maps runtime log severity onto hub log levels", () => {
		// Vitest runs default to the "error" hub log level; the mapping under
		// test needs warn/info to be emitted too.
		vi.stubEnv("CLINE_HUB_LOG_LEVEL", "info");
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const logger = createHubRuntimeLogger();

		logger.log('[mcp] Failed to load tools from MCP server "slow", skipping', {
			severity: "warn",
			sessionId: "s1",
		});
		logger.log("plain operational message");
		logger.error?.("boom", { error: new Error("nope") });

		expect(errorSpy).toHaveBeenCalledTimes(2);
		expect(parsePayload(errorSpy.mock.calls[0])).toMatchObject({
			level: "warn",
			component: "hub",
			message: '[mcp] Failed to load tools from MCP server "slow", skipping',
			sessionId: "s1",
		});
		expect(parsePayload(errorSpy.mock.calls[0])).not.toHaveProperty("severity");
		expect(parsePayload(errorSpy.mock.calls[1])).toMatchObject({
			level: "error",
			message: "boom",
			error: { message: "nope" },
		});
		expect(logSpy).toHaveBeenCalledTimes(1);
		expect(parsePayload(logSpy.mock.calls[0])).toMatchObject({
			level: "info",
			message: "plain operational message",
		});
	});
});
