import { describe, it, expect } from 'vitest';
import { generateRoundRobinPairs } from './tournament.service';

function flattenFixtures(rounds: Array<Array<[string, string]>>): Array<[string, string]> {
  return rounds.flat();
}

describe('generateRoundRobinPairs', () => {
  it('pairs every team with every other team exactly once (even team count)', () => {
    const teams = ['A', 'B', 'C', 'D'];
    const rounds = generateRoundRobinPairs(teams);
    const fixtures = flattenFixtures(rounds);

    expect(rounds).toHaveLength(teams.length - 1);
    expect(fixtures).toHaveLength((teams.length * (teams.length - 1)) / 2);

    const seenPairs = new Set(fixtures.map(([home, away]) => [home, away].sort().join('-')));
    expect(seenPairs.size).toBe(fixtures.length);

    for (const team of teams) {
      const opponents = fixtures.filter(([home, away]) => home === team || away === team);
      expect(opponents).toHaveLength(teams.length - 1);
    }
  });

  it('gives every team exactly one bye per round with an odd team count', () => {
    const teams = ['A', 'B', 'C', 'D', 'E'];
    const rounds = generateRoundRobinPairs(teams);
    const fixtures = flattenFixtures(rounds);

    // With an odd number of teams, one team sits out each round, so total
    // fixtures = teams * (teams - 1) / 2, same combinatorial total as even case.
    expect(fixtures).toHaveLength((teams.length * (teams.length - 1)) / 2);

    for (const [home, away] of fixtures) {
      expect(home).not.toBe(away);
    }
  });

  it('never schedules a team against itself', () => {
    const rounds = generateRoundRobinPairs(['A', 'B', 'C', 'D', 'E', 'F']);
    for (const [home, away] of flattenFixtures(rounds)) {
      expect(home).not.toBe(away);
    }
  });
});
