import NumberSpinBox from "../../src/base/NumberSpinBox.js";
import RepeatButton from "../../src/base/RepeatButton.js";
import { fragmentFrom } from "../../src/core/htmlLiterals.js";
import {
  defaultState,
  render,
  state,
  template,
} from "../../src/core/internal.js";

export default class CustomSpinBox extends NumberSpinBox {
  // @ts-ignore
  get [defaultState]() {
    return Object.assign(super[defaultState], {
      buttonPartType: RepeatButton,
    });
  }

  [render](changed) {
    super[render](changed);
    if (changed.value) {
      const { value } = this[state];
      const negative = parseInt(value) < 0;
      this.style.borderColor = negative ? "rgb(255, 0, 255)" : "";
      this.style.backgroundColor = negative ? "rgba(255, 0, 255, 0.1)" : "";
    }
  }

  get [template]() {
    const result = super[template];
    const upButton = result.content.getElementById("upButton");
    upButton.textContent = "▲";
    const downButton = result.content.getElementById("downButton");
    downButton.textContent = "▼";
    result.content.append(fragmentFrom.html`
      <style>
        :host {
          border: 2px solid #6e00ff;
          border-radius: 5px;
          overflow: hidden;
        }

        [part~="input"] {
          background: none;
          border: none;
          padding: 0.3em 0.6em;
          width: 4em;
        }

        [part~="spin-button"] {
          background: linear-gradient(50deg, #6e00ff 0, #bb00ff 100%);
          border-radius: 0;
          border-width: 0;
          color: #ddd;
          font-size: 0.6em;
          overflow: hidden;
          padding: 0.3em 0.6em;
          padding: 2px;
        }

        [part~="spin-button"]:hover {
          background: #bb00ff;
          color: white;
        }
      </style>
    `);
    return result;
  }
}

customElements.define("custom-spin-box", CustomSpinBox);
