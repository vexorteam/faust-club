const NBSP = " "

const GROUP_SIZE = 3

/** 1250 → "1 250" with a non-breaking space between the groups. */
const groupThousands = (value: number): string => {
  const digits = Math.trunc(Math.abs(value)).toString()
  const groups: string[] = []

  for (let end = digits.length; end > 0; end -= GROUP_SIZE) {
    groups.unshift(digits.slice(Math.max(0, end - GROUP_SIZE), end))
  }

  return `${value < 0 ? "-" : ""}${groups.join(NBSP)}`
}

/** 1250 → "1 250 ₴" */
export const formatPrice = (value: number): string => `${groupThousands(value)}${NBSP}₴`

/**
 * Ukrainian plural for the three forms the language needs: 1 позиція,
 * 2 позиції, 5 позицій. Used in counters and in the text that explains why a
 * category refuses to be deleted.
 */
export const pluralize = (count: number, one: string, few: string, many: string): string => {
  const absolute = Math.abs(count) % 100
  const last = absolute % 10

  if (absolute > 10 && absolute < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one

  return many
}

/** 0 → "0 позицій", 1 → "1 позиція", 6 → "6 позицій" */
export const formatItemsCount = (count: number): string =>
  `${count}${NBSP}${pluralize(count, "позиція", "позиції", "позицій")}`
