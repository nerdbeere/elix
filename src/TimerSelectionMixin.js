import * as symbols from './symbols.js';
import ReactiveElement from './ReactiveElement.js'; // eslint-disable-line no-unused-vars


/**
 * Automatically updates selection on a timer.
 * 
 * [SlideshowWithPlayControls uses TimerSelectionMixin for its timer](/demos/slideshowWithPlayControls.html)
 * 
 * If the user changes the selection, or the selection changes for any other reason,
 * the timer resets. This ensures the user has a chance to look at the item they want
 * before the timer advances the selection.
 * 
 * @module TimerSelectionMixin
 * @param {Constructor<ReactiveElement>} Base
 */
export default function TimerSelectionMixin(Base) {

  // The class prototype added by the mixin.
  class TimerSelection extends Base {

    [symbols.componentDidMount]() {
      if (super[symbols.componentDidMount]) { super[symbols.componentDidMount](); }
      updateTimer(this);
    }
    
    [symbols.componentDidUpdate](/** @type {PlainObject} */ changed) {
      if (super[symbols.componentDidUpdate]) { super[symbols.componentDidUpdate](changed); }
      updateTimer(this);
    }

    get [symbols.defaultState]() {
      return Object.assign(super[symbols.defaultState], {
        playing: true,
        selectedIndexForTimer: null,
        selectionTimerDuration: 1000,
        timerTimeout: null
      });
    }

    /**
     * Begin automatic progression of the selection.
     */
    play() {
      if (!this.playing) {
        this.selectNext();
        this[symbols.setState]({
          playing: true
        });
      }
    }

    /**
     * Pause automatic progression of the selection.
     */
    pause() {
      this[symbols.setState]({
        playing: false
      });
    }

    /**
     * True if the element is playing.
     *
     * @type {boolean}
     * @default false
     */
    get playing() {
      return this[symbols.state].playing;
    }
    set playing(playing) {
      const parsed = String(playing) === 'true';
      if (parsed !== this[symbols.state].playing) {
        if (parsed) {
          this.play();
        } else {
          this.pause();
        }
      }
    }

    /**
     * The time in milliseconds that will elapse after the selection changes
     * before the selection will be advanced to the next item in the list.
     *
     * @type {number} - Time in milliseconds
     * @default 1000 (1 second)
     */
    get selectionTimerDuration() {
      return this[symbols.state].selectionTimerDuration;
    }
    set selectionTimerDuration(selectionTimerDuration) {
      const parsed = Number(selectionTimerDuration);
      if (!isNaN(parsed)) {
        this[symbols.setState]({
          selectionTimerDuration: parsed
        });
      }
    }

  }

  return TimerSelection;
}


function clearTimer(/** @type {ReactiveElement} */ element) {
  if (element[symbols.state].timerTimeout) {
    clearTimeout(element[symbols.state].timerTimeout);
    element[symbols.setState]({
      timerTimeout: null
    });
  }
}

function restartTimer(/** @type {ReactiveElement} */ element) {
  if (element[symbols.state].timerTimeout) {
    clearTimeout(element[symbols.state].timerTimeout);
  }
  if (element.items && element.items.length > 0) {

    // When the timer times out, all we need to do is move to the next slide.
    // When the component updates, the updateTimer function will notice the
    // change in selection, and invoke restartTimer again to start a new timer
    // for the next slide.
    const timerTimeout = setTimeout(() => {
      element.selectNext();
    }, element.selectionTimerDuration);

    // Set the timer as state, also noting which slide we're currently on.
    element[symbols.setState]({
      selectedIndexForTimer: element[symbols.state].selectedIndex,
      timerTimeout
    });
  }
}

// Update the timer to match the element's `playing` state.
function updateTimer(/** @type {ReactiveElement} */ element) {
  // If the element is playing and we haven't started a timer yet, do so now.
  // Also, if the element's selectedIndex changed for any reason, restart the
  // timer. This ensures that the timer restarts no matter why the selection
  // changes: it could have been us moving to the next slide because the timer
  // elapsed, or the user might have directly manipulated the selection, etc.
  if (element[symbols.state].playing &&
      (!element[symbols.state].timerTimeout || element[symbols.state].selectedIndex !== element[symbols.state].selectedIndexForTimer)) {
    restartTimer(element);
  } else if (!element[symbols.state].playing && element[symbols.state].timerTimeout) {
    clearTimer(element);
  }
}
