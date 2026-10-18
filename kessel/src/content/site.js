// Site-wide content: brand, navigation, contact and footer.
// Fictional business: every contact detail here is a placeholder.
export const site = {
  name: 'Kessel Optics',
  short: 'Kessel',
  city: 'Pune',
  founded: 2017,
  email: 'studio@kessel.example',
  phone: '+91 00000 00000',
  // One page: the main nav jumps within it. The earlier pages stay
  // reachable from a small link row in the footer.
  nav: [
    { href: '#teardown', label: 'Teardown' },
    { href: '#film-workshop', label: 'Company' },
    { href: '#film-contact', label: 'Contact' },
  ],
  more: [
    { href: '#lenses', label: 'Lenses' },
    { href: '#craft', label: 'Craft' },
    { href: '#workshop', label: 'Workshop' },
  ],

  footer: {
    blurb: 'An independent lens maker in Pune. Cinema and photography lenses, each assembled by hand by one optician and signed on the barrel.',
    disclaimer: 'Unofficial concept created independently for presentation purposes.',
  },
  // Shown under every specification table.
  specNote: 'Sample figures for this concept. Final specifications would come from the maker.',
  proposalNote: 'Lens names and roles are proposals for this concept.',
};
