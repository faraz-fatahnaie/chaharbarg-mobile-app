import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@chaharbarg/engine';
import { Rooms } from '../src/rooms';

describe('turn timeout', () => {
  it('plays for an idle player, and after 3 timeouts in a row a bot takes the seat', async () => {
    const finished: unknown[] = [];
    const rooms = new Rooms({ rng: mulberry32(5), idleLimitMs: 20, botDelayMs: 1, dealPauseMs: 5, onFinish: (f) => finished.push(f) });
    const r = rooms.create('p1', 'Idle', 2, 35, 0);
    rooms.start(r.code, 'p1', true); // seat 1 is a bot; p1 never moves
    await new Promise((res) => setTimeout(res, 400));
    expect(r.seats[0].bot).toBe(true);
    expect(r.seats[0].abandoned).toBe(true);
    await new Promise((res) => setTimeout(res, 2500));
    expect(r.status).toBe('over'); // the bots finished the match
    expect(finished).toHaveLength(1);
    expect((finished[0] as { players: { abandoned: boolean }[] }).players[0].abandoned).toBe(true);
    rooms.close();
  });
});
