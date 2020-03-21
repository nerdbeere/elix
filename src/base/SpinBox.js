import { forwardFocus } from "../core/dom.js";
import * as internal from "./internal.js";
import * as template from "../core/template.js";
import DelegateFocusMixin from "./DelegateFocusMixin.js";
import FormElementMixin from "./FormElementMixin.js";
import KeyboardDirectionMixin from "./KeyboardDirectionMixin.js";
import KeyboardMixin from "./KeyboardMixin.js";
import ReactiveElement from "../core/ReactiveElement.js";

const Base = DelegateFocusMixin(
  FormElementMixin(KeyboardMixin(KeyboardDirectionMixin(ReactiveElement)))
);

/**
 * Input element with buttons to increase or decrease the value
 *
 * @inherits ReactiveElement
 * @mixes DelegateFocusMixin
 * @mixes FormElementMixin
 * @mixes KeyboardDirectionMixin
 * @mixes KeyboardMixin
 * @part {input} input - the text input portion of the spin box
 * @part {button} button - the up and down buttons
 * @part up-button - the up button
 * @part down-button - the down button
 */
export class SpinBox extends Base {
  get [internal.defaultState]() {
    return Object.assign(super[internal.defaultState], {
      buttonPartType: "button",
      inputPartType: "input",
      orientation: "vertical",
      step: 1,
      value: 0
    });
  }

  [internal.goDown]() {
    if (super[internal.goDown]) {
      super[internal.goDown]();
    }
    this.stepDown();
  }

  [internal.goUp]() {
    if (super[internal.goUp]) {
      super[internal.goUp]();
    }
    this.stepUp();
  }

  [internal.render](changed) {
    super[internal.render](changed);

    renderParts(this[internal.shadowRoot], this[internal.state], changed);

    // Wire up handlers on new buttons.
    if (changed.buttonPartType) {
      this[internal.ids].downButton.addEventListener("mousedown", () => {
        this.stepDown();
      });
      this[internal.ids].upButton.addEventListener("mousedown", () => {
        this.stepUp();
      });
    }

    // Wire up event handler on new input.
    if (changed.inputPartType) {
      // Wire up handler on new input.
      this[internal.ids].input.addEventListener("input", () => {
        this.value = /** @type {any} */ (this[internal.ids].input).value;
      });

      // TODO: Avoid referencing inner
      this[internal.ids].input.style.outline = "none";
      this[internal.ids].input.inner.style.outline = "none";
    }

    // When buttons are clicked, keep focus on input.
    if (changed.buttonPartType || changed.inputPartType) {
      const input = this[internal.ids].input;
      const downButton = this[internal.ids].downButton;
      if (downButton instanceof HTMLElement && input instanceof HTMLElement) {
        forwardFocus(downButton, input);
      }
      const upButton = this[internal.ids].upButton;
      if (upButton instanceof HTMLElement && input instanceof HTMLElement) {
        forwardFocus(upButton, input);
      }
    }

    // Render value state to input.
    if (changed.value) {
      const { value } = this[internal.state];
      /** @type {any} */ (this[internal.ids].input).value = value;
    }
  }

  stepDown() {}

  stepUp() {}

  get [internal.template]() {
    return template.html`
      <style>
        :host {
          display: inline-grid;
        }

        :host(:focus-within) {
          outline-color: Highlight; /* Firefox */
          outline-color: -webkit-focus-ring-color; /* Everyone else */
          outline-style: auto;
          outline-width: 2px;
        }

        [part~="input"] {
          grid-row-end: 3;
          grid-row-start: 1;
          text-align: right;
        }

        [part~="spin-button"] {
          grid-column: 2;
          user-select: none;
        }
      </style>
      <div id="input" part="input"></div>
      <div id="upButton" part="spin-button up-button" tabindex="-1"></div>
      <div id="downButton" part="spin-button down-button" tabindex="-1"></div>
    `;
  }

  /**
   * The value entered in the spin box.
   *
   * @type {string}
   * @default "0"
   */
  get value() {
    return this[internal.state].value;
  }
  set value(value) {
    this[internal.setState]({ value });
  }
}

/**
 * Render parts for the template or an instance.
 *
 * @private
 * @param {DocumentFragment} root
 * @param {PlainObject} state
 * @param {ChangedFlags} [changed]
 */
function renderParts(root, state, changed) {
  if (!changed || changed.inputPartType) {
    const { buttonPartType } = state;
    const buttons = root.querySelectorAll('[part~="spin-button"]');
    buttons.forEach(button => {
      template.transmute(button, buttonPartType);
    });
  }
  if (!changed || changed.inputPartType) {
    const { inputPartType } = state;
    const input = root.getElementById("input");
    if (input) {
      template.transmute(input, inputPartType);
    }
  }
}

export default SpinBox;