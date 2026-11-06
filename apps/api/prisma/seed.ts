// Seeds reference data (cities + interests) + demo hosts and plans so the app has live plans out of the box.
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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function main() {
  for (const [name, state] of cities) {
    await prisma.city.upsert({
      where: { slug: slugify(name) },
      update: { state },
      create: { name, state, slug: slugify(name) },
    });
  }
  for (const [category, names] of Object.entries(interests)) {
    for (const name of names) {
      await prisma.interest.upsert({
        where: { slug: slugify(name) },
        update: { category },
        create: { name, category, slug: slugify(name) },
      });
    }
  }

  // Seed demo hosts & plans if no plans exist yet
  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    const blr = await prisma.city.findUniqueOrThrow({ where: { slug: 'bangalore' } });
    const hyd = await prisma.city.findUniqueOrThrow({ where: { slug: 'hyderabad' } });
    const coffee = await prisma.interest.findUniqueOrThrow({ where: { slug: 'coffee' } });
    const badminton = await prisma.interest.findUniqueOrThrow({ where: { slug: 'badminton' } });
    const boardGames = await prisma.interest.findUniqueOrThrow({ where: { slug: 'board-games' } });
    const dinners = await prisma.interest.findUniqueOrThrow({ where: { slug: 'dinners' } });

    const rohan = await prisma.user.upsert({
      where: { phone: '+919900000001' },
      update: {},
      create: {
        phone: '+919900000001',
        name: 'Rohan',
        birthDate: new Date('1997-04-12T00:00:00.000Z'),
        gender: 'man',
        bio: 'Product designer in Indiranagar. Specialty coffee & weekend doubles badminton.',
        cityId: blr.id,
        onboardedAt: new Date(),
        interests: {
          create: [{ interestId: coffee.id }, { interestId: badminton.id }, { interestId: boardGames.id }],
        },
      },
    });

    const meera = await prisma.user.upsert({
      where: { phone: '+919900000002' },
      update: {},
      create: {
        phone: '+919900000002',
        name: 'Meera',
        birthDate: new Date('1999-08-22T00:00:00.000Z'),
        gender: 'woman',
        bio: 'Moved to Hyderabad recently! Love board games, ramen nights, and live gigs.',
        cityId: hyd.id,
        onboardedAt: new Date(),
        interests: {
          create: [{ interestId: dinners.id }, { interestId: boardGames.id }, { interestId: coffee.id }],
        },
      },
    });

    const tomorrow7pm = new Date(Date.now() + 26 * 3600_000);
    const sat10am = new Date(Date.now() + 50 * 3600_000);
    const sun6pm = new Date(Date.now() + 74 * 3600_000);

    const p1 = await prisma.plan.create({
      data: {
        hostId: rohan.id,
        cityId: blr.id,
        interestId: coffee.id,
        title: 'Specialty Pour-Over & Conversations',
        description: 'Casual evening coffee meetup for newcomers and regulars in Indiranagar. Great way to meet 5 new friends!',
        venue: 'Araku Coffee, 12th Main Indiranagar',
        startsAt: tomorrow7pm,
        capacity: 6,
        members: {
          create: [{ userId: rohan.id, role: 'HOST', status: 'APPROVED' }],
        },
      },
    });

    await prisma.planMessage.create({
      data: {
        planId: p1.id,
        senderId: rohan.id,
        body: 'Hey everyone! Once approved, drop a quick intro here before we meet at Araku ☕',
      },
    });

    await prisma.plan.create({
      data: {
        hostId: rohan.id,
        cityId: blr.id,
        interestId: badminton.id,
        title: 'Saturday Morning Doubles Badminton',
        description: 'Intermediate-friendly doubles session. Non-marking shoes required; shuttles provided.',
        venue: 'Play Arena, Sarjapur Road',
        startsAt: sat10am,
        capacity: 4,
        members: {
          create: [{ userId: rohan.id, role: 'HOST', status: 'APPROVED' }],
        },
      },
    });

    await prisma.plan.create({
      data: {
        hostId: meera.id,
        cityId: hyd.id,
        interestId: boardGames.id,
        title: 'Catan & Codenames Night in Jubilee Hills',
        description: 'Beginner-friendly board game table! Come solo—we teach the rules before every round.',
        venue: 'Board Game Cafe, Road No. 36 Jubilee Hills',
        startsAt: sun6pm,
        capacity: 6,
        members: {
          create: [{ userId: meera.id, role: 'HOST', status: 'APPROVED' }],
        },
      },
    });
  }

  console.log(`Seeded ${cities.length} cities and ${Object.values(interests).flat().length} interests`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
