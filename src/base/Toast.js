import {
  defaultState,
  effectEndTarget,
  ids,
  render,
  rendered,
  setState,
  state,
} from "./internal.js";
import LanguageDirectionMixin from "./LanguageDirectionMixin.js";
import Popup from "./Popup.js";
import TransitionEffectMixin from "./TransitionEffectMixin.js";

const timeoutKey = Symbol("timeout");

const Base = LanguageDirectionMixin(TransitionEffectMixin(Popup));

/**
 * Lightweight popup intended to display a short, non-critical message
 *
 * The message remains until  the user dismisses it or a specified `duration`
 * elapses.
 *
 * @inherits Popup
 * @mixes LanguageDirectionMixin
 * @mixes TransitionEffectMixin
 */
class Toast extends Base {
  constructor() {
    super();
    this.addEventListener("mouseout", () => {
      startTimerIfOpened(this);
    });
    this.addEventListener("mouseover", () => {
      clearTimer(this);
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "duration") {
      this.duration = Number(newValue);
    } else {
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }

  // @ts-ignore
  get [defaultState]() {
    return Object.assign(super[defaultState], {
      duration: null,
      fromEdge: "bottom",
    });
  }

  /**
   * The duration, in milliseconds, for which the toast will appear on screen.
   *
   * The `duration` value refers to the duration of time in which the toast
   * will appear on the screen. In other words, this is the time between
   * the `opened` and `closed` event for the toast.
   *
   * @type {number}
   * @default null
   */
  get duration() {
    return this[state].duration;
  }
  set duration(duration) {
    if (!isNaN(duration)) {
      this[setState]({ duration });
    }
  }

  // @ts-ignore
  get [effectEndTarget]() {
    return this[ids].frame;
  }

  /**
   * The edge of the viewport from which the toast will appear.
   *
   * The `start` and `end` values refer to text direction: in left-to-right
   * languages such as English, these are equivalent to `left` and `right`,
   * respectively.
   *
   * @type {('bottom'|'end'|'left'|'right'|'start'|'top')}
   * @default 'bottom'
   */
  get fromEdge() {
    return this[state].fromEdge;
  }
  set fromEdge(fromEdge) {
    this[setState]({ fromEdge });
  }

  [render](/** @type {ChangedFlags} */ changed) {
    super[render](changed);
    if (changed.fromEdge) {
      // Host
      /** @type {IndexedObject<any>} */
      const hostEdgeStyles = {
        bottom: {
          alignItems: "center",
          justifyContent: "flex-end",
        },
        "bottom-left": {
          alignItems: "flex-start",
          justifyContent: "flex-end",
        },
        "bottom-right": {
          alignItems: "flex-end",
          justifyContent: "flex-end",
        },
        top: {
          alignItems: "center",
          justifyContent: null,
        },
        "top-left": {
          alignItems: "flex-start",
          justifyContent: null,
        },
        "top-right": {
          alignItems: "flex-end",
          justifyContent: null,
        },
      };
      Object.assign(this.style, hostEdgeStyles[this[state].fromEdge]);
    }
    if (
      changed.effect ||
      changed.effectPhase ||
      changed.fromEdge ||
      changed.rightToLeft
    ) {
      const { effect, effectPhase, fromEdge, rightToLeft } = this[state];
      /** @type {IndexedObject<string>} */
      const oppositeEdge = {
        "bottom-left": "bottom-right",
        "bottom-right": "bottom-left",
        "top-left": "top-right",
        "top-right": "top-left",
      };
      const languageAdjustedEdge = rightToLeft
        ? oppositeEdge[fromEdge] || fromEdge
        : fromEdge;

      /** @type {IndexedObject<string>} */
      const edgeTransforms = {
        bottom: "translateY(100%)",
        "bottom-left": "translateX(-100%)",
        "bottom-right": "translateX(100%)",
        top: "translateY(-100%)",
        "top-left": "translateX(-100%)",
        "top-right": "translateX(100%)",
      };

      /** @type {IndexedObject<string>} */
      const openEdgeTransforms = {
        bottom: "translateY(0)",
        "bottom-left": "translateX(0)",
        "bottom-right": "translateX(0)",
        top: "translateY(0)",
        "top-left": "translateX(0)",
        "top-right": "translateX(0)",
      };

      const opened =
        (effect === "open" && effectPhase !== "before") ||
        (effect === "close" && effectPhase === "before");

      const opacity = opened ? 1 : 0;
      const transform = opened
        ? openEdgeTransforms[languageAdjustedEdge]
        : edgeTransforms[languageAdjustedEdge];

      Object.assign(this[ids].frame.style, {
        opacity,
        transform,
      });
    }
  }

  [rendered](/** @type {ChangedFlags} */ changed) {
    super[rendered](changed);
    startTimerIfOpened(this);
  }
}

function clearTimer(/** @type {Toast} */ element) {
  /** @type {any} */ const cast = element;
  if (cast[timeoutKey]) {
    clearTimeout(cast[timeoutKey]);
    cast[timeoutKey] = null;
  }
}

function startTimer(/** @type {Toast} */ element) {
  clearTimer(element);
  const duration = element[state].duration;
  if (duration !== null && duration > 0) {
    /** @type {any} */ (element)[timeoutKey] = setTimeout(() => {
      element.close();
    }, duration);
  }
}

function startTimerIfOpened(/** @type {Toast} */ element) {
  if (element.opened) {
    startTimer(element);
  }
}

export default Toast;
