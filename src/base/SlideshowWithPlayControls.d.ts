// Elix is a JavaScript project, but we define TypeScript declarations so we can
// confirm our code is type safe, and to support TypeScript users.

import AriaListMixin from "./AriaListMixin.js";
import DirectionCursorMixin from "./DirectionCursorMixin.js";
import FocusVisibleMixin from "./FocusVisibleMixin.js";
import KeyboardDirectionMixin from "./KeyboardDirectionMixin.js";
import KeyboardMixin from "./KeyboardMixin.js";
import LanguageDirectionMixin from "./LanguageDirectionMixin.js";
import PlayControlsMixin from "./PlayControlsMixin.js";
import Slideshow from "./Slideshow.js";
import SwipeDirectionMixin from "./SwipeDirectionMixin.js";
import TouchSwipeMixin from "./TouchSwipeMixin.js";
import TrackpadSwipeMixin from "./TrackpadSwipeMixin.js";

export default class SlideshowWithPlayControls extends AriaListMixin(
  DirectionCursorMixin(
    FocusVisibleMixin(
      KeyboardDirectionMixin(
        KeyboardMixin(
          LanguageDirectionMixin(
            PlayControlsMixin(
              SwipeDirectionMixin(
                TouchSwipeMixin(TrackpadSwipeMixin(Slideshow))
              )
            )
          )
        )
      )
    )
  )
) {}
