const ADJECTIVES = [
  'Swift',
  'Calm',
  'Bright',
  'Quiet',
  'Bold',
  'Gentle',
  'Sharp',
  'Warm',
  'Cool',
  'Vivid',
  'Brave',
  'Kind',
  'Wise',
  'Sunny',
  'Silent',
  'Clever',
  'Lucky',
  'Steady',
  'Nimble',
  'Cheerful',
  'Mighty',
  'Curious',
  'Playful',
  'Serene',
  'Fierce',
  'Gracious',
  'Radiant',
  'Humble',
  'Lively',
  'Noble',
  'Breezy',
  'Cozy',
  'Dreamy',
  'Eager',
  'Frosty',
  'Golden',
  'Hazy',
  'Jolly',
  'Misty',
  'Tranquil'
];

const NOUNS = [
  'Otter',
  'Falcon',
  'Maple',
  'Comet',
  'Ember',
  'Willow',
  'Harbor',
  'Lynx',
  'Cedar',
  'Raven',
  'River',
  'Meadow',
  'Phoenix',
  'Badger',
  'Aspen',
  'Pebble',
  'Sparrow',
  'Glacier',
  'Coral',
  'Thistle',
  'Heron',
  'Canyon',
  'Juniper',
  'Dolphin',
  'Marlin',
  'Birch',
  'Kestrel',
  'Tundra',
  'Orchid',
  'Panther',
  'Lagoon',
  'Fjord',
  'Sable',
  'Wren',
  'Cascade',
  'Prairie',
  'Nimbus',
  'Cobalt',
  'Alder',
  'Zephyr'
];

function hashUid(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return hash;
}

export function generateNickname(uid: string): string {
  const hash = hashUid(uid);
  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]}${NOUNS[nounIndex]}`;
}

export function getNickname(user: {
  userNicknameFromGoogleAccount: string | null;
  uid: string;
}): string {
  return user.userNicknameFromGoogleAccount ?? generateNickname(user.uid);
}
