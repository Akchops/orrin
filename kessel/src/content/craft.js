// How a Kessel lens is made, in five steps. Images are stills rendered from
// the lens scene. The copy describes the stages of hand assembly in general
// terms; it makes no claims about suppliers, tolerances or equipment.
export const craft = {
  title: 'How a Kessel lens is made',
  lead: 'Five stages, one pair of hands. Each lens is assembled by a single optician, from the first element to the signature on the barrel.',
  steps: [
    {
      no: '01', title: 'The glass', image: 'through',
      body: [
        'Every element is cleaned and checked by eye before it goes into its cell. They are seated in the order the light will meet them, from the front of the lens to the back.',
        'The spacing between elements is part of the design, so each one is set at its own distance from the next before the stack is closed up.',
      ],
    },
    {
      no: '02', title: 'The iris', image: 'iris34',
      body: [
        'The blades go into the iris ring one at a time. Once they are in, the iris is run through its whole travel, from a pinhole to fully open, and watched for any blade that catches.',
        'The aperture ring that drives it is fitted afterwards and turned against the blades until the movement is even all the way round.',
      ],
    },
    {
      no: '03', title: 'Barrel and focus ring', image: 'focus',
      body: [
        'The focus ring is fitted to the barrel and its engraved distance scale is checked against the index mark, so that what the ring says is where the lens is focused.',
        'The ring is meant to be turned by hand, take after take, so its weight and the evenness of its turn are checked as carefully as the scale.',
      ],
    },
    {
      no: '04', title: 'Bringing it together', image: 'exploded',
      body: [
        'The sections of the barrel are joined around the glass and the iris. Before the lens is closed for good, the whole optical stack is checked for alignment.',
        'This is the stage the film on the home page plays backwards: every part moving back into its place around the light path.',
      ],
    },
    {
      no: '05', title: 'Signed on the barrel', image: 'signed',
      body: [
        'When the lens is finished, the optician who built it signs the barrel. One person, start to finish, and their mark stays on the lens.',
        'If a lens ever comes back to the workshop, the signature says whose hands it went through.',
      ],
    },
  ],
};
