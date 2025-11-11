/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * This file is for manual type definitions for things that aren't yet available
 * in TypeScript, but should be in the next target version (esnext). This
 * typically occurs when a feature has been implemented in Gecko, but not yet
 * reached ECMAScript stage 4, or multi-browser support.
 */

// Additions for Temporal.
// xref https://github.com/microsoft/TypeScript/pull/62628

/**
 * Basic simulation of the Temporal interface.
 * https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal
 */
declare namespace Temporal {
  type Instant = any;
}

declare var Temporal: {
  Duration: any;
  Instant: any;
  Now: any;
  PlainDate: any;
  PlainDateTime: any;
  PlainMonthDay: any;
  PlainTime: any;
  PlainYearMonth: any;
  ZonedDateTime: any;
};

interface Date {
  toTemporalInstant(): Temporal.Instant;
}
