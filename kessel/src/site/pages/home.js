// Home: the scroll film, then the site takes over.
import { site, esc, paras, href, lensRoute, img, contactLines, proposalTag, footer, route, pageHead } from '../parts.js';
import { home } from '../../content/home.js';
import { film } from '../../content/film.js';
import { craft } from '../../content/craft.js';
import { lenses } from '../../content/lenses.js';
import { filmHTML } from '../film.js';



export function homeHTML() {
  // One continuous page: the hero is the film's first frame, the film
  // runs in full and carries straight on into the teardown.
  return route('home', `${site.name} · ${film.hero.title.replace(/\.$/, '')}`, `
<noscript><p class="notice notice--static">JavaScript is off. The live lens needs it, so each stage below is a still frame with its caption.</p></noscript>
<p class="notice" id="notice" hidden></p>
${filmHTML()}
<div class="page-end">
  ${footer('#top')}
</div>`, 'route--home');
}
