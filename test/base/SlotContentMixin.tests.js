import {
  contentSlot,
  render,
  shadowRoot,
  state,
} from "../../src/base/internal.js";
import SlotContentMixin from "../../src/base/SlotContentMixin.js";
import ReactiveMixin from "../../src/core/ReactiveMixin.js";
import { assert } from "../testHelpers.js";

/*
 * Simple element using the SlotContentMixin mixin.
 */
class SlotContentTest extends SlotContentMixin(ReactiveMixin(HTMLElement)) {
  [render](/** @type {PlainObject} */ changed) {
    super[render](changed);
    if (!this[shadowRoot]) {
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
        <div id="static">This is static content</div>
        <slot></slot>
      `;
      this[shadowRoot] = root;
    }
  }
}
customElements.define("slot-content-test", SlotContentTest);

/*
 * Element wrapping an instance of the above, so we can test detection of
 * changes in final distribution (not just direct slot assignments).
 */
class WrappedContentTest extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `<slot-content-test><slot></slot></default-slotcontent-test>`;
  }
}
customElements.define("wrapped-content-test", WrappedContentTest);

describe("SlotContentMixin", () => {
  let container;

  before(() => {
    container = document.getElementById("container");
  });

  afterEach(() => {
    container.innerHTML = "";
  });

  it("uses the component's default slot as the default slot for content", async () => {
    const fixture = new SlotContentTest();
    container.append(fixture);
    // Wait for initial content.
    await Promise.resolve();
    const slot = fixture.shadowRoot && fixture.shadowRoot.children[1];
    assert.equal(fixture[contentSlot], slot);
  });

  it("returns direct assigned nodes as content", async () => {
    const fixture = new SlotContentTest();
    fixture.innerHTML = `<div>One</div><div>Two</div><div>Three</div>`;
    container.append(fixture);
    // Wait for initial content.
    await Promise.resolve();
    assert.equal(fixture[state].content.length, 3);
  });

  it("returns distributed nodes as content", async () => {
    const wrapper = new WrappedContentTest();
    wrapper.innerHTML = `<div>One</div><div>Two</div><div>Three</div>`;
    const fixture =
      wrapper.shadowRoot &&
      wrapper.shadowRoot.querySelector("slot-content-test");
    container.append(wrapper);
    // Wait for initial content.
    await Promise.resolve();
    const content = fixture && fixture[state].content;
    assert.equal(content.length, 3);
  });

  it("sets content when defined component is parsed", async () => {
    container.innerHTML = `<slot-content-test>beaver</slot-content-test>`;
    const fixture = container.querySelector("slot-content-test");
    // Wait for initial content.
    await Promise.resolve();
    assert.equal(fixture[state].content[0].textContent, "beaver");
  });

  it("updates content when textContent changes", async () => {
    const fixture = new SlotContentTest();
    container.append(fixture);
    // Wait for initial content.
    fixture.textContent = "chihuahua";
    // Wait for slotchange event to be processed.
    await Promise.resolve();
    assert.equal(fixture[state].content[0].textContent, "chihuahua");
  });

  it("updates content when children change", async () => {
    const fixture = new SlotContentTest();
    container.append(fixture);
    // Wait for initial content.
    const div = document.createElement("div");
    div.textContent = "dingo";
    fixture.append(div);
    // Wait for slotchange event to be processed.
    await Promise.resolve();
    assert.equal(fixture[state].content[0].textContent, "dingo");
  });

  it("updates content when redistributed content changes", async () => {
    const wrapper = new WrappedContentTest();
    const fixture =
      wrapper.shadowRoot &&
      wrapper.shadowRoot.querySelector("slot-content-test");
    container.append(wrapper);
    // Wait for initial content.
    wrapper.textContent = "echidna";
    // Wait for slotchange event to be processed.
    await Promise.resolve();
    const content = fixture && fixture[state].content;
    assert.equal(content[0].textContent, "echidna");
  });

  it("updates content if node is removed from light DOM", async () => {
    const fixture = new SlotContentTest();
    const div = document.createElement("div");
    div.textContent = "hippopotamus";
    fixture.append(div);
    container.append(fixture);
    // Wait for initial content and for first
    // slotchange event to be processed.

    // Remove a light DOM child, which should trigger content update.
    fixture.removeChild(div);

    // Wait for second slotchange event to be processed.
    await Promise.resolve();
    assert.equal(fixture[state].content.length, 0);
  });

  it("gets initial content from initial innerHTML", async () => {
    container.innerHTML = "<slot-content-test>iguana</slot-content-test>";
    const fixture = container.querySelector("slot-content-test");
    // Wait for initial content.
    await Promise.resolve();
    assert.equal(fixture[state].content[0].textContent, "iguana");
  });
});
