import { describe, it, expect } from '@jest/globals';
import { Semaphore } from '../src/runner/semaphore.js';

describe('Semaphore', () => {
  it('throws when initialized with non-positive permits', () => {
    expect(() => new Semaphore(0)).toThrow();
    expect(() => new Semaphore(-1)).toThrow();
  });

  it('allows acquisition up to the permit limit without blocking', async () => {
    const sem = new Semaphore(3);
    await sem.acquire();
    await sem.acquire();
    await sem.acquire();
    expect(sem.available).toBe(0);
  });

  it('queues acquisition beyond the permit limit', async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    let resolved = false;
    const p = sem.acquire().then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(sem.queued).toBe(1);

    sem.release();
    await p;
    expect(resolved).toBe(true);
  });

  it('unblocks queued waiters in FIFO order', async () => {
    const sem = new Semaphore(1);
    await sem.acquire();

    const order: number[] = [];
    const p1 = sem.acquire().then(() => order.push(1));
    const p2 = sem.acquire().then(() => order.push(2));
    const p3 = sem.acquire().then(() => order.push(3));

    sem.release();
    await Promise.resolve();
    sem.release();
    await Promise.resolve();
    sem.release();
    await Promise.resolve();
    sem.release();
    await Promise.resolve();

    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('tracks available permits correctly after acquire/release', async () => {
    const sem = new Semaphore(5);
    await sem.acquire();
    await sem.acquire();
    expect(sem.available).toBe(3);
    sem.release();
    expect(sem.available).toBe(4);
    sem.release();
    expect(sem.available).toBe(5);
    sem.release();
    expect(sem.available).toBe(6);
  });

  it('handles high concurrency without deadlock', async () => {
    const sem = new Semaphore(10);
    const results = await Promise.all(
      Array.from({ length: 100 }, async (_, i) => {
        await sem.acquire();
        await new Promise<void>((r) => setImmediate(r));
        sem.release();
        return i;
      }),
    );
    expect(results).toHaveLength(100);
  });
});
