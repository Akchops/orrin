// Craft: the five stages of building a lens, told by one drawing that
// builds up stage by stage (kessel/src/app/craft-lens.js); the lens up
// close follows (kessel/src/content/inspect.js). The copy describes the
// stages in general terms; it makes no claims about suppliers, tolerances,
// equipment or people, and it is labelled as sample content.
export const craft = {
  eyebrow: 'Craft · Five stages',
  title: 'Five stages of building a lens',
  sample: 'Sample content for this concept',
  // The drawing, for screen readers: what it shows when it is finished.
  figTitle: 'A Kessel lens on the bench, drawn in five stages',
  figDesc: 'A lens lies on two stands on a workbench at dusk, a window behind it looking out at a fort on a hill and a desk lamp beside it. The top half of the lens is cut away to show the inside: seven coated glass elements in five groups, the iris between them, the black anodised barrel with its knurled focus ring and engraved distance scale, and the stainless mount at the back. Above the lens a detail shows the iris face on, eleven blades half closed. Under the lamp, a pen has just signed the rear barrel.',
  // Shown with the stage buttons and the slider.
  control: 'Stage, 1 to 5',
  controlHint: 'tap a stage or drag',
  // After the signing: the shell closes and the lens turns to face you.
  sealed: {
    name: 'Sealed',
    text: 'The shell closes over the glass from the mount to the front, and the finished lens turns to face you, its front glass towards you.',
    hint: 'Drag to open it up again',
    inside: 'Show inside',
    // The two stills shown without JavaScript.
    capInside: 'Inside: all five stages finished, the top half cut away to show the glass, the iris and the barrel.',
    capSealed: 'Sealed: the shell closed over the glass and the lens turned to face you, its front glass towards you.',
    figTitle: 'The finished Kessel lens, sealed and face on',
  },
  stages: [
    {
      key: 'glass', no: '01', name: 'Glass', more: '',
      text: 'Seven elements in five groups are ground, polished and coated. The thin coating cuts reflections, and it is what catches the light violet and green.',
    },
    {
      key: 'iris', no: '02', name: 'Iris', more: '',
      text: 'Eleven blades are laid into the iris housing, each overlapping the next. The iris is run from open to closed until it closes evenly all the way round.',
    },
    {
      key: 'barrel', no: '03', name: 'Barrel', more: ' and focus ring',
      text: 'The barrel and the knurled focus ring are machined, anodised black and left bare at the edges. The distance scale is engraved on the ring and checked against the index mark.',
    },
    {
      key: 'assembly', no: '04', name: 'Assembly', more: '',
      text: 'Each group is seated in its cell and centred on the axis, and the stainless mount goes on last. The finished lens is then tested through its focus and its iris.',
    },
    {
      key: 'signing', no: '05', name: 'Signing', more: '',
      text: 'When the lens has passed its tests, the optician who built it signs the rear barrel under the lamp. The signature stays on the lens.',
    },
  ],
  next: [
    { route: 'lenses', label: 'Next', text: 'See the three', last: 'lenses' },
    { route: 'company', label: 'Then', text: 'About the', last: 'company' },
  ],
};
