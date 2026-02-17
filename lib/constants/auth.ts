import { generateDummyPassword } from "../db/utils";

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const SHOW_TOOL_MESSAGES_COOKIE_NAME = "show-tool-messages";
