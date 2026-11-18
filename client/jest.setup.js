import { TextDecoder, TextEncoder } from "util";
import "@testing-library/jest-dom";

if (typeof globalThis.TextEncoder === "undefined") {
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}
// jsdom has <dialog> but not its modal methods. What the browser does on its own
// (the inert page, Escape, focus) is checked in a real browser, not here.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
        if (!this.hasAttribute("open")) return;
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
    };
}
