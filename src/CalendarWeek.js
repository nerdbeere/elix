import './CalendarDay.js';
import { merge } from './updates.js';
import { symbols } from './elix.js';
import * as calendar from './calendar.js';
import * as template from './template.js';
import ReactiveElement from './ReactiveElement.js';


class CalendarWeek extends ReactiveElement {

  get date() {
    return this.state.date;
  }
  set date(date) {
    this.setState({ date });
  }

  get days() {
    return this.shadowRoot ?
      [
        this.$.day0,
        this.$.day1,
        this.$.day2,
        this.$.day3,
        this.$.day4,
        this.$.day5,
        this.$.day6
      ] :
      null;
  }

  get defaultState() {
    return Object.assign({}, super.defaultState, {
      date: new Date,
      locale: navigator.language,
      outsideMonth: false
    });
  }

  get locale() {
    return this.state.locale;
  }
  set locale(locale) {
    this.setState({ locale });
  }

  get outsideMonth() {
    return this.state.outsideMonth;
  }
  set outsideMonth(outsideMonth) {
    this.setState({ outsideMonth });
  }

  /// TODO: role for calendar day
  get [symbols.template]() {
    return template.html`
      <style>
        :host {
          display: table-row;
        }

        .day {
          display: table-cell;
          width: 14.285%; /* One seventh */
        }
      </style>

      <elix-calendar-day id="day0" class="day firstDayOfWeek"></elix-calendar-day>
      <elix-calendar-day id="day1" class="day"></elix-calendar-day>
      <elix-calendar-day id="day2" class="day"></elix-calendar-day>
      <elix-calendar-day id="day3" class="day"></elix-calendar-day>
      <elix-calendar-day id="day4" class="day"></elix-calendar-day>
      <elix-calendar-day id="day5" class="day"></elix-calendar-day>
      <elix-calendar-day id="day6" class="day lastDayOfWeek"></elix-calendar-day>
    `;
  }

  get updates() {
    const referenceDate = this.state.date;
    const referenceYear = referenceDate.getFullYear();
    const referenceMonth = referenceDate.getMonth();
    const dateStart = calendar.firstDateOfWeek(referenceDate, this.state.locale);
    const dayUpdates = {};
    for (let i = 0; i <= 6; i++) {
      const date = calendar.offsetDateByDays(dateStart, i);
      // Apply inside/outside month styles to days that fall outside of the
      // month of the reference date for this week.
      const outsideMonth = this.state.outsideMonth ||
        !(date.getFullYear() === referenceYear && date.getMonth() === referenceMonth);
      dayUpdates[`day${i}`] = {
        classes: {
          insideMonth: !outsideMonth,
          outsideMonth
        },
        date
      };
    }

    return merge(super.updates, {
      $: dayUpdates
    });
  }

}


export default CalendarWeek;
customElements.define('elix-calendar-week', CalendarWeek);
