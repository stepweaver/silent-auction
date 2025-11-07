export default function SiteBanner({ deadlineISO = null }) {
  if (!deadlineISO) {
    return null;
  }

  const deadline = new Date(deadlineISO);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  });

  const message =
    deadline <= now
      ? `The auction closed at ${timeFormatter.format(
          deadline
        )} on ${dateFormatter.format(deadline)}.`
      : `The auction will close at ${timeFormatter.format(
          deadline
        )} on ${dateFormatter.format(deadline)}.`;

  return (
    <div
      className='border-b shadow-sm'
      style={{
        background:
          'linear-gradient(135deg, var(--primary-600), var(--primary-500))',
        borderColor: 'rgba(2, 68, 52, 0.25)',
      }}
    >
      <div
        className='max-w-7xl mx-auto px-4 py-2 text-sm sm:text-base font-medium text-center text-white'
        role='status'
        aria-live='polite'
      >
        {message}
      </div>
    </div>
  );
}
