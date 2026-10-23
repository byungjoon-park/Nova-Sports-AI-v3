import test from "node:test";
import assert from "node:assert/strict";
import { containsContactInfo, containsHealthQuestion, getResponseText } from "../lib/support-ai-rules.mjs";

test("blocks health-related questions without forwarding the conversation", () => {
  assert.equal(containsHealthQuestion([{ role: "user", content: "무릎이 아프고 부었어요" }]), true);
  assert.equal(containsHealthQuestion([{ role: "user", content: "로그인 방법을 알려주세요" }]), false);
});

test("detects email addresses and Korean mobile numbers in user messages", () => {
  assert.equal(containsContactInfo([{ role: "user", content: "my email is person@example.com" }]), true);
  assert.equal(containsContactInfo([{ role: "user", content: "연락처 010-1234-5678" }]), true);
  assert.equal(containsContactInfo([{ role: "user", content: "비밀번호를 바꾸는 방법" }]), false);
});

test("extracts response text from the Responses API payload shapes", () => {
  assert.equal(getResponseText({ output_text: "  안내 문구  " }), "안내 문구");
  assert.equal(getResponseText({ output: [{ content: [{ text: "첫 문장" }, { text: "둘째 문장" }] }] }), "첫 문장\n둘째 문장");
  assert.equal(getResponseText(null), "");
});
