import test from "node:test";
import assert from "node:assert/strict";
import { cn } from "./utils";

test("cn merges Tailwind classes and conditional inputs", () => {
  assert.equal(cn("px-2 py-1", "px-4"), "py-1 px-4");
  assert.equal(cn("text-sm", false && "hidden", "font-bold"), "text-sm font-bold");
});
