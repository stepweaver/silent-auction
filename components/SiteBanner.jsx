 'use client';

 import { useMemo } from 'react';

 export default function SiteBanner({ deadlineISO = null }) {
   const message = useMemo(() => {
     if (!deadlineISO) {
       return "We're testing the site — the silent auction closing time will be announced soon.";
     }

     const deadline = new Date(deadlineISO);
     if (Number.isNaN(deadline.getTime())) {
       return "We're testing the site — the silent auction closing time will be announced soon.";
     }

     const now = new Date();
     const timeFormatter = new Intl.DateTimeFormat(undefined, {
       timeStyle: 'short',
     });
     const dateFormatter = new Intl.DateTimeFormat(undefined, {
       dateStyle: 'full',
     });

     if (deadline <= now) {
       return `We're testing the site — the silent auction closed on ${dateFormatter.format(
         deadline,
       )} at ${timeFormatter.format(deadline)}.`;
     }

     const sameDay = deadline.toDateString() === now.toDateString();
     if (sameDay) {
       return `We're testing the site — the silent auction closes tonight at ${timeFormatter.format(
         deadline,
       )}.`;
     }

     return `We're testing the site — the silent auction closes on ${dateFormatter.format(
       deadline,
     )} at ${timeFormatter.format(deadline)}.`;
   }, [deadlineISO]);

   return (
     <div className='bg-amber-50 border-b border-amber-200 text-amber-900 shadow-sm'>
       <div className='max-w-7xl mx-auto px-4 py-2 text-sm sm:text-base font-medium text-center'>
         {message}
       </div>
     </div>
   );
 }

