import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../types';
import { getVenueWeeklyHours, parseHoursText } from './venueExtras';

describe('programul localurilor', () => {
  it('citește programul text din backend pe zile', () => {
    const week = parseHoursText('Luni închis, Marți–Miercuri 17:00–00:00, Joi 17:00–02:00, Vineri 17:00–04:00, Sâmbătă 18:00–04:00, Duminică închis');
    expect(week).toEqual([
      { day: 'Luni', hours: 'Închis' }, { day: 'Marți', hours: '17:00 – 00:00' }, { day: 'Miercuri', hours: '17:00 – 00:00' },
      { day: 'Joi', hours: '17:00 – 02:00' }, { day: 'Vineri', hours: '17:00 – 04:00' }, { day: 'Sâmbătă', hours: '18:00 – 04:00' },
      { day: 'Duminică', hours: 'Închis' },
    ]);
  });
  it('lasă necunoscute zilele care lipsesc și refuză formatele pe care nu le înțelege', () => {
    expect(parseHoursText('Vineri 11:00–23:00')?.find((entry) => entry.day === 'Luni')?.hours).toBe('—');
    expect(parseHoursText('Lu–Du: 09:00 – 00:00')).toBeNull();
    expect(parseHoursText('Non-stop')).toBeNull();
  });
  it('păstrează vechiul format „Lu–Du: …” pentru localurile din datele statice', () => {
    const week = getVenueWeeklyHours({ id: 'x', hours: 'Lu–Du: 09:00 – 00:00' } as Restaurant);
    expect(week.every((entry) => entry.hours === '09:00 – 00:00')).toBe(true);
  });
});
