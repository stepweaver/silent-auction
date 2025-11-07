export default function SiteBanner({ deadlineISO = null }) {
  let message = "We're testing the site — the silent auction closing time will be announced soon.";

  if (deadlineISO) {
    const deadline = new Date(deadlineISO);

    if (!Number.isNaN(deadline.getTime())) {
      const now = new Date();
      const timeFormatter = new Intl.DateTimeFormat(undefined, {
        timeStyle: 'short',
      });
      const dateFormatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'full',
      });

      if (deadline <= now) {
        message = `We're testing the site — the silent auction closed on ${dateFormatter.format(
          deadline,
        )} at ${timeFormatter.format(deadline)}.`;
      } else if (deadline.toDateString() === now.toDateString()) {
        message = `We're testing the site — the silent auction closes tonight at ${timeFormatter.format(
          deadline,
        )}.`;
      } else {
        message = `We're testing the site — the silent auction closes on ${dateFormatter.format(
          deadline,
        )} at ${timeFormatter.format(deadline)}.`;
      }
    }
  }

   return (
     <div className='bg-amber-50 border-b border-amber-200 text-amber-900 shadow-sm'>
       <div className='max-w-7xl mx-auto px-4 py-2 text-sm sm:text-base font-medium text-center'>
         {message}
       </div>
     </div>
   );
 }

