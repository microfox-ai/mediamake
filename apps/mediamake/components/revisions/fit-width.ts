/**
 * Classes for a ScrollArea whose rows must fit its column. Radix lays the
 * content out as a table, which grows to the widest row: long names then never
 * truncate, long words push cards past the window's edge, and the column
 * scrolls sideways. Block layout keeps every row to the column's width.
 */
export const FIT_WIDTH =
  '[&>[data-slot=scroll-area-viewport]>div]:!block [&>[data-slot=scroll-area-viewport]>div]:!min-w-0 [&>[data-slot=scroll-area-viewport]>div]:!w-full';
