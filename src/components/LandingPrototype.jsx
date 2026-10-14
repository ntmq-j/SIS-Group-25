import { lazy, Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import BrandMark from './BrandMark';
import '../landing-prototype.css';

const CampusMap = lazy(() => import('./CampusMap'));

// Sample data keeps this reviewable landing direction separate from the live feed.
const sampleMapItems = [
  {
    id: 'sample-coffee-break',
    type: 'event',
    source: 'activity',
    title: 'Coffee break',
    location: 'UTS Café · Building 1',
    time: 'Today · 12:15 PM',
    author: '2 of 3 joined',
    category: 'coffee_break',
    latitude: -33.8836,
    longitude: 151.201,
  },
  {
    id: 'sample-study-session',
    type: 'event',
    source: 'activity',
    title: 'Study session',
    location: 'UTS Library',
    time: 'Today · 12:30 PM',
    author: '2 of 3 joined',
    category: 'study_session',
    latitude: -33.8832,
    longitude: 151.2003,
  },
  {
    id: 'sample-walk',
    type: 'event',
    source: 'activity',
    title: 'Walk after class',
    location: 'Goods Line · public path',
    time: 'Today · 1:00 PM',
    author: '2 spots open',
    category: 'walk',
    latitude: -33.8845,
    longitude: 151.202,
  },
  {
    id: 'sample-official-event',
    type: 'event',
    source: 'official_event',
    title: 'Design society drop-in',
    location: 'UTS Building 6 · public foyer',
    time: 'Today · 1:00 PM',
    author: 'Hosted by UTS',
    category: 'group_discussion',
    latitude: -33.8826,
    longitude: 151.2004,
  },
  {
    id: 'sample-availability-area',
    type: 'presence',
    source: 'presence',
    location: 'UTS Broadway campus',
    availablePeople: 6,
    latitude: -33.8838,
    longitude: 151.1994,
  },
];

function MapPreview() {
  return (
    <section className="map-preview" aria-label="Recess campus map preview">
      <Suspense fallback={<div className="map-preview__loading">Loading campus map…</div>}>
        <CampusMap events={sampleMapItems} showHeader={false} showLegend={false} />
      </Suspense>
    </section>
  );
}

export default function LandingPrototype() {
  return (
    <div className="prototype-shell" id="top">
      <header className="prototype-nav">
        <BrandMark href="#top" className="prototype-brand" />
        <nav className="prototype-nav__links" aria-label="Main navigation">
          <a href="#campus-map">Explore nearby</a>
          <a href="#why-recess">Why Recess</a>
          <a href="/?auth=signin">Sign in</a>
        </nav>
        <a className="nav-cta" href="/?auth=signup">
          Join Recess <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="prototype-hero" aria-labelledby="prototype-title">
          <div className="prototype-hero__copy">
            <p className="eyebrow"><span className="eyebrow__line" /> A little free time goes a long way</p>
            <h1 id="prototype-title">Your next break, <em>well spent.</em></h1>
            <p className="prototype-hero__lede">
              Find people and small plans near your campus or workplace. Choose a public place, join when it suits you, and make a real connection.
            </p>
            <div className="hero-actions">
              <a className="button button--primary" href="/?auth=signup">
                Find your people <span aria-hidden="true">↗</span>
              </a>
              <a className="button button--quiet" href="#campus-map">See what is nearby <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-note">
              <span className="hero-note__check"><ShieldCheck size={16} /></span>
              <span>For verified campus and workplace communities.</span>
            </div>
          </div>
          <div className="prototype-hero__visual" id="campus-map">
            <MapPreview />
          </div>
        </section>

        <section className="principles" id="why-recess" aria-label="What makes Recess different">
          <article><span className="principles__icon">01</span><div><strong>See what is nearby</strong><p>Discover people, small activities and approved events around your community.</p></div></article>
          <article><span className="principles__icon">02</span><div><strong>Keep plans low-pressure</strong><p>Join a coffee, quick study session or short walk when you have a gap.</p></div></article>
          <article><span className="principles__icon">03</span><div><strong>Meet with more confidence</strong><p>Verified communities, public places and approximate locations by design.</p></div></article>
        </section>
      </main>

      <footer className="prototype-footer">
        <BrandMark href="#top" className="prototype-brand" />
        <a className="prototype-footer__legal" href="/terms">Terms of Service</a>
        <span>Small plans. Real connections.</span>
      </footer>

    </div>
  );
}
