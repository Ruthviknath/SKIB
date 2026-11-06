// Seeds reference data (cities + interests). Safe to re-run (upserts).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cities: Array<[name: string, state: string]> = [
  ['Bangalore', 'Karnataka'],
  ['Hyderabad', 'Telangana'],
  ['Mumbai', 'Maharashtra'],
  ['Pune', 'Maharashtra'],
  ['Delhi', 'Delhi'],
  ['Gurugram', 'Haryana'],
  ['Chennai', 'Tamil Nadu'],
  ['Kolkata', 'West Bengal'],
];

const interests: Record<string, string[]> = {
  'Food & Drink': ['Dinners', 'Drinks', 'Coffee', 'Brunch', 'Street Food', 'Cooking'],
  Sports: ['Running', 'Badminton', 'Football', 'Cricket', 'Pickleball', 'Gym', 'Yoga'],
  Outdoors: ['Hiking', 'Walks', 'Cycling', 'Trekking', 'Camping'],
  Culture: ['Movies', 'Live Music', 'Art', 'Books', 'Theatre', 'Stand-up Comedy'],
  Social: ['Board Games', 'Quiz Nights', 'Travel', 'Photography', 'Tech', 'Startups', 'Volunteering'],
};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  for (const [name, state] of cities) {
    await prisma.city.upsert({ where: { slug: slugify(name) }, update: { state }, create: { name, state, slug: slugify(name) } });
  }
  for (const [category, names] of Object.entries(interests)) {
    for (const name of names) {
      await prisma.interest.upsert({ where: { slug: slugify(name) }, update: { category }, create: { name, category, slug: slugify(name) } });
    }
  }
  console.log(`Seeded ${cities.length} cities and ${Object.values(interests).flat().length} interests`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
