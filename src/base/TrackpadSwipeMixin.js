import { canScrollInDirection } from "./scrolling.js";
import * as internal from "./internal.js";
import ReactiveElement from "../core/ReactiveElement.js"; // eslint-disable-line no-unused-vars

const absorbDecelerationKey = Symbol("absorbDeceleration");
const deferToScrollingKey = Symbol("deferToScrolling");
const lastDeltaXKey = Symbol("lastDeltaX");
const lastDeltaYKey = Symbol("lastDeltaY");
const lastWheelTimeoutKey = Symbol("lastWheelTimeout");
const postGestureDelayCompleteKey = Symbol("postGestureDelayComplete");
const wheelDistanceKey = Symbol("wheelDistance");
const wheelSequenceAxisKey = Symbol("wheelSequenceAxis");

// Time we wait following a gesture before paying attention to wheel events
// again.
const POST_GESTURE_TIME = 250;

// Time we wait after the last wheel event before we reset things.
const WHEEL_TIME = 100;

/**
 * Map trackpad events to swipe gestures.
 *
 * @module TrackpadSwipeMixin
 * @param {Constructor<ReactiveElement>} Base
 */
export default function TrackpadSwipeMixin(Base) {
  // The class prototype added by the mixin.
  return class TrackpadSwipe extends Base {
    constructor() {
      // @ts-ignore
      super();
      this.addEventListener("wheel", async event => {
        this[internal.raiseChangeEvents] = true;
        const handled = handleWheel(this, event);
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
        await Promise.resolve();
        this[internal.raiseChangeEvents] = false;
      });
      resetWheelTracking(this);
    }

    get [internal.defaultState]() {
      return Object.assign(super[internal.defaultState], {
        swipeAxis: "horizontal",
        swipeDownWillCommit: false,
        swipeFraction: null,
        swipeFractionMax: 1,
        swipeFractionMin: -1,
        swipeLeftWillCommit: false,
        swipeRightWillCommit: false,
        swipeUpWillCommit: false
      });
    }

    /**
     * See [internal.swipeTarget](internal#internal.swipeTarget).
     *
     * @property internal.swipeTarget
     * @memberof TrackpadSwipeMixin
     * @type {HTMLElement}
     */
    get [internal.swipeTarget]() {
      const base = super[internal.swipeTarget];
      return base || this;
    }

    [internal.stateEffects](state, changed) {
      const effects = super[internal.stateEffects]
        ? super[internal.stateEffects](state, changed)
        : {};

      // If the swipeFraction crosses the -0.5 or 0.5 mark, update our notion of
      // whether we'll commit an operation if the swipe were to finish at that
      // point. This definition is compatible with one defined by
      // TouchSwipeMixin.
      if (changed.swipeFraction) {
        const { swipeAxis, swipeFraction } = state;
        if (swipeFraction !== null) {
          if (swipeAxis === "horizontal") {
            Object.assign(effects, {
              swipeLeftWillCommit: swipeFraction <= -0.5,
              swipeRightWillCommit: swipeFraction >= 0.5
            });
          } else {
            Object.assign(effects, {
              swipeUpWillCommit: swipeFraction <= -0.5,
              swipeDownWillCommit: swipeFraction >= 0.5
            });
          }
        }
      }

      return effects;
    }
  };
}

/**
 * A wheel event has been generated. This could be a real wheel event, or it
 * could be fake (see notes in the header).
 *
 * This handler uses several strategies to try to approximate native trackpad
 * swipe gesture.
 *
 * If the user has dragged enough to cause a gesture, then for a short delay
 * following that gesture, subsequent wheel events will be ignored.
 *
 * Furthermore, following a gesture, we ignore all wheel events until we receive
 * at least one event where the event's deltaX (distance traveled) is *greater*
 * than the previous event's deltaX. This helps us filter out the fake wheel
 * events generated by the browser to simulate deceleration.
 *
 * @private
 * @param {ReactiveElement} element
 * @param {WheelEvent} event
 */
function handleWheel(element, event) {
  /** @type {any} */ const cast = element;

  // Since we have a new wheel event, reset our timer waiting for the last
  // wheel event to pass.
  if (cast[lastWheelTimeoutKey]) {
    clearTimeout(cast[lastWheelTimeoutKey]);
  }
  cast[lastWheelTimeoutKey] = setTimeout(async () => {
    element[internal.raiseChangeEvents] = true;
    wheelTimedOut(element);
    await Promise.resolve();
    cast[internal.raiseChangeEvents] = false;
  }, WHEEL_TIME);

  const deltaX = event.deltaX;
  const deltaY = event.deltaY;

  // See if component event represents acceleration or deceleration.
  const { swipeAxis, swipeFractionMax, swipeFractionMin } = element[
    internal.state
  ];
  const vertical = swipeAxis === "vertical";
  const acceleration = vertical
    ? Math.sign(deltaY) * (deltaY - cast[lastDeltaYKey])
    : Math.sign(deltaX) * (deltaX - cast[lastDeltaXKey]);
  cast[lastDeltaXKey] = deltaX;
  cast[lastDeltaYKey] = deltaY;

  // Is this the first wheel event in a swipe sequence?
  const eventBeginsSwipe = cast[wheelSequenceAxisKey] === null;

  // Was this specific event more vertical or more horizontal?
  const eventAxis =
    Math.abs(deltaY) > Math.abs(deltaX) ? "vertical" : "horizontal";

  if (!eventBeginsSwipe && eventAxis !== cast[wheelSequenceAxisKey]) {
    // This event continues a sequence. If the event's axis is perpendicular to
    // the sequence's axis, we'll absorb this event. E.g., if the user started a
    // vertical swipe (to scroll, say), then we absorb all subsequent horizontal
    // wheel events in the sequence.
    return true;
  }

  if (eventAxis !== swipeAxis) {
    // Move wasn't along the axis we care about, ignore it.
    return false;
  }

  if (!cast[postGestureDelayCompleteKey]) {
    // It's too soon after a gesture; absorb the event.
    return true;
  }

  if (acceleration > 0) {
    // The events are not (or are no longer) decelerating, so we can start
    // paying attention to them again.
    cast[absorbDecelerationKey] = false;
  } else if (cast[absorbDecelerationKey]) {
    // The wheel event was likely faked to simulate deceleration; absorb it.
    return true;
  }

  // Scrolling initially takes precedence over swiping.
  const scrollTarget = element[internal.scrollTarget] || element;
  if (cast[deferToScrollingKey]) {
    // Predict whether the browser's default behavior for this event would cause
    // the swipe target or any of its ancestors to scroll.
    const deltaAlongAxis = vertical ? deltaY : deltaX;
    const downOrRight = deltaAlongAxis > 0;
    const willScroll = canScrollInDirection(
      scrollTarget,
      swipeAxis,
      downOrRight
    );
    if (willScroll) {
      // Don't interfere with scrolling.
      return false;
    }
  }

  // If we get this far, we have a wheel event we want to handle.

  // From this point on, swiping will take precedence over scrolling.
  cast[deferToScrollingKey] = false;

  if (eventBeginsSwipe) {
    // This first event's axis will determine which axis we'll respect for the
    // rest of the sequence.
    cast[wheelSequenceAxisKey] = eventAxis;
    if (element[internal.swipeStart]) {
      // Let component know a swipe is starting.
      element[internal.swipeStart](event.clientX, event.clientY);
    }
  }

  cast[wheelDistanceKey] -= vertical ? deltaY : deltaX;

  // Update the travel fraction of the component being navigated.
  const swipeTarget = cast[internal.swipeTarget];
  const targetDimension = vertical
    ? swipeTarget.offsetHeight
    : swipeTarget.offsetWidth;
  let fraction =
    targetDimension > 0 ? cast[wheelDistanceKey] / targetDimension : 0;
  fraction = Math.sign(fraction) * Math.min(Math.abs(fraction), 1);
  const swipeFraction = Math.max(
    Math.min(fraction, swipeFractionMax),
    swipeFractionMin
  );

  // If the user has dragged enough to reach the previous/next item, then
  // perform the gesture immediately. (We don't need to wait for the wheel to
  // time out.)
  let gesture;
  if (swipeFraction === -1) {
    gesture = vertical ? internal.swipeUp : internal.swipeLeft;
  } else if (swipeFraction === 1) {
    gesture = vertical ? internal.swipeDown : internal.swipeRight;
  }
  if (gesture) {
    performImmediateGesture(element, gesture);
  } else {
    element[internal.setState]({ swipeFraction });
  }

  return true;
}

/**
 * Immediately perform the indicated gesture.
 *
 * @private
 * @param {ReactiveElement} element
 * @param {string} gesture
 */
function performImmediateGesture(element, gesture) {
  if (element[gesture]) {
    element[gesture]();
  }
  // Reset our tracking following the gesture. Because the user may still be
  // swiping on the trackpad, we reset things slightly differently than when the
  // wheel times out.
  /** @type {any} */ const cast = element;
  cast[absorbDecelerationKey] = true;
  cast[deferToScrollingKey] = true;
  cast[postGestureDelayCompleteKey] = false;
  cast[wheelDistanceKey] = 0;
  cast[wheelSequenceAxisKey] = null;
  setTimeout(() => {
    cast[postGestureDelayCompleteKey] = true;
  }, POST_GESTURE_TIME);
  // We've handled a gesture, so reset notion of what gestures are in progress.
  element[internal.setState]({
    swipeDownWillCommit: false,
    swipeFraction: null,
    swipeLeftWillCommit: false,
    swipeRightWillCommit: false,
    swipeUpWillCommit: false
  });
}

/**
 * Reset all state related to the tracking of the wheel.
 *
 * @private
 * @param {ReactiveElement} element
 */
function resetWheelTracking(element) {
  /** @type {any} */ const cast = element;
  cast[absorbDecelerationKey] = false;
  cast[deferToScrollingKey] = true;
  cast[lastDeltaXKey] = 0;
  cast[lastDeltaYKey] = 0;
  cast[postGestureDelayCompleteKey] = true;
  cast[wheelDistanceKey] = 0;
  cast[wheelSequenceAxisKey] = null;
  if (cast[lastWheelTimeoutKey]) {
    clearTimeout(cast[lastWheelTimeoutKey]);
    cast[lastWheelTimeoutKey] = null;
  }
}

/**
 * A sufficiently long period of time has passed since the last wheel event.
 * We snap the selection to the closest item, then reset our state.
 *
 * @private
 * @param {ReactiveElement} element
 */
async function wheelTimedOut(element) {
  // If the user swiped far enough to commit a gesture, handle it now.
  let gesture;
  if (element[internal.state].swipeDownWillCommit) {
    gesture = internal.swipeDown;
  } else if (element[internal.state].swipeLeftWillCommit) {
    gesture = internal.swipeLeft;
  } else if (element[internal.state].swipeRightWillCommit) {
    gesture = internal.swipeRight;
  } else if (element[internal.state].swipeUpWillCommit) {
    gesture = internal.swipeUp;
  }

  resetWheelTracking(element);
  element[internal.setState]({
    swipeDownWillCommit: false,
    swipeFraction: null,
    swipeLeftWillCommit: false,
    swipeRightWillCommit: false,
    swipeUpWillCommit: false
  });

  if (gesture && element[gesture]) {
    await element[gesture]();
  }
}
