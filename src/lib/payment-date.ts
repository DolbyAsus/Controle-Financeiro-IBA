const saoPauloDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toIsoDate(value: Date) {
  const parts = saoPauloDateParts.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function paymentDateWindow(now = new Date()) {
  const maximum = toIsoDate(now);
  const year = Number(maximum.slice(0, 4));

  return {
    minimum: `${year - 1}-01-01`,
    maximum,
  };
}

export function isPaymentDateAllowed(value: string, now = new Date()) {
  const { minimum, maximum } = paymentDateWindow(now);
  return value >= minimum && value <= maximum;
}

