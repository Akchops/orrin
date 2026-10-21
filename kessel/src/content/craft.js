// Craft: the five stages of building a lens, each with a close-up still
// rendered from the lens scene. The copy describes the stages of hand
// assembly in general terms; it makes no claims about suppliers,
// tolerances, equipment or people, and it is labelled as sample content.
export const craft = {
  eyebrow: 'Craft · Five stages',
  // The headline is set in two lines over the exploded lens.
  title: ['Five stages', 'of building a lens'],
  lead: 'Loose glass at one end of the bench, a signed lens at the other. Every Kessel lens passes through the same five stages, in the same pair of hands.',
  sample: 'Sample content for this concept',
  cue: 'The five stages',
  stagesTitle: 'Stage by stage',
  // How to move between the stages, shown once the stepper is running.
  hint: { touch: 'Tap a stage, or swipe the picture', keys: 'Choose a stage, or use the arrow keys' },
  steps: [
    {
      key: 'glass', no: '01', name: 'Glass', title: 'The glass', tag: 'Ground, polished, coated', image: 'd-glass',
      body: 'Each element starts as a blank that is ground to its curve, then polished until the surface is clear and even. The coating goes on last: a thin layer that cuts reflections and gives the glass its violet and green tint. Every element is checked by eye before it leaves this stage.',
    },
    {
      key: 'iris', no: '02', name: 'Iris', title: 'The iris', tag: 'The blades fitted', image: 'd-iris',
      body: 'The blades are laid into the iris ring one at a time, each overlapping the next. The ring is then run from fully open to its smallest opening and back, while the optician watches for a blade that catches or drags. Only an iris that closes evenly goes into the barrel.',
    },
    {
      key: 'barrel', no: '03', name: 'Barrel', title: 'Barrel and focus ring', tag: 'Machined, threaded, engraved', image: 'd-scale',
      body: 'The barrel and the focus ring are machined, then anodised black. Inside the ring sits the focus helicoid, a fine spiral thread that moves the glass forward and back as the ring turns. The distance scale is engraved on the outside and checked against the index mark, so the number you read is where the lens focuses.',
    },
    {
      key: 'assembly', no: '04', name: 'Assembly', title: 'Assembly', tag: 'Set, centred, tested', image: 'd-mount',
      body: 'The elements go into the barrel in order, each set at its own distance from the next, because that spacing is part of the design. Each one is centred on the light path, so nothing sits off the axis. The closed lens is then tested through the whole focus scale and across the iris.',
    },
    {
      key: 'signing', no: '05', name: 'Signing', title: 'Signed on the barrel', tag: 'The last thing at the bench', image: 'd-sign',
      body: 'When the lens has passed its tests, the optician who built it signs the barrel. It is the last thing that happens at the bench. The signature stays on the lens, so it always says whose hands it went through.',
    },
  ],
  next: [
    { route: 'lenses', label: 'Next', text: 'See the three', last: 'lenses' },
    { route: 'company', label: 'Then', text: 'About the', last: 'company' },
  ],
};
