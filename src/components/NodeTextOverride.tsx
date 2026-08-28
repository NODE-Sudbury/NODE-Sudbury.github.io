'use client'
import { useEffect } from 'react'

const REPLACEMENTS: [string, string][] = [
  ['Day 1', 'Hackathons'],
  ['Day 2', 'Community Events'],
  ['Who & When', 'Events'],
  ['A look at how the tech ecosystem is evolving in Northern Ontario.', 'How developers, founders, and makers are shaping the region.'],
  ['Quick-hit talks from developers, founders, and employers across the region.', 'Short talks from developers, founders, and employers building in Northern Ontario.'],
  ['Community Talk', 'Talk'],
  // Board Members section
  ['Meet our community', 'Board Members'],
  ['Developers, designers, and founders from across Northern Ontario.', 'NODE founding board - positions and appointments coming soon.'],
  ['Developers, founders, and designers from across Northern Ontario.', 'NODE founding board - positions and appointments coming soon.'],

  // Board member names -> TBD
  ['Ava Morales', 'TBD'],
  ['Juniper Walsh', 'TBD'],
  ['Hana Okabe', 'TBD'],
  ['Felix Strom', 'TBD'],
  ['Omar Kalidi', 'TBD'],
  ['Lotte Swaan', 'TBD'],
  ['Elias Mendez', 'TBD'],
  ['Nova Renfield', 'TBD'],

  // Board roles (8 roles for 8 visible cards)
  ['UX Designer & Accessibility Advocate', 'Secretary'],
  ['Brand Designer & Creative Director', 'Treasurer'],
  ['Full-Stack Developer & OSS Contributor', 'Marketing'],
  ['CTO & Co-founder', 'Promotion/Sponsorship'],
  ['Framer Expert & Interface Architect', 'Marketing'],

  // Hero / nav branding
  ['Offscreen', 'NODE'],
  ['OFFSCREEN', 'NODE'],

  // Hero subtitle - full string and per-word fallbacks
  ['Creatives. Conversations. Connections.', 'Career. Growth. Connection.'],
  ['Builders. Advocates. Community.', 'Career. Growth. Connection.'],
  ['Creatives.', 'Career.'],
  ['Conversations.', 'Growth.'],
  ['Connections.', 'Connection.'],
  ['Builders.', 'Career.'],
  ['Advocates.', 'Growth.'],

  // "An organization for developers" - accent word
  ['An event for', 'An organization for'],
  ['makers', 'developers'],

  // Tickets section
  ['00:00:00:00', 'Join the network'],
  ['Join NODE - From $60/year', 'Join NODE - $60/year, $10/year for students'],
  ['Limited seats—secure your spot now.', 'Limited seats - secure your spot now.'],

  // Ticker / marquee lines
  ['Join us live in Amsterdam', 'Professional advancement for devs in Northern Ontario'],
  ['Early bird tickets now available', 'Annual gala - coming 2027'],
  ['Limited seats available', 'Membership from $60/year'],

  // Hero description paragraph (DOM uses curly apostrophe U+2019)
  [
    "This isn\u2019t your typical creative event. Think live talks, real connections, design jams, and no awkward networking.",
    "NODE supports careers in software development through professional growth events, business attraction initiatives, and a network connecting workers, employers, and government partners across Northern Ontario.",
  ],

  // Info bar - bottom of hero
  ['1 jul - 2 jul, 2026', 'Est. 2026'],
  ['09:00 - 21:00', 'Community-driven'],
  ['Studio Draadloos', 'Norcat Innovation Hub'],
  ['STUDIO DRAADLOOS', 'NORCAT INNOVATION HUB'],
  ['/ STUDIO DRAADLOOS', '/ Norcat Innovation Hub'],
  ['Kabelgracht 17, Amsterdam', '1545 Maley Dr, Greater Sudbury, ON P3A 4R7'],
  ['1234 AB Sudbury, Ontario', 'Home of the monthly speaker series.'],

  // Partner card names (order: Foundry, Norcat, GDG, Cursor)
  ['Catalog', 'Laurentian University Foundry'],
  ['Circooles', 'Norcat'],
  ['Sisyphus', 'GDG Sudbury'],
  ['Hourglass', 'Cursor Sudbury'],
  ['Kabelgracht 17', '1545 Maley Dr, Greater Sudbury, ON P3A 4R7'],
  ['1234 AB Amsterdam', 'Home of the monthly speaker series.'],
  ['AMSTERDAM', 'SUDBURY'],
  ['Amsterdam', 'Sudbury'],

  // Big hero overlay text and ticket graphic
  ['01/02.07', 'Est.2026'],
  ['01.07 - 02.07', 'Est. 2026'],

  ['Keynote Talk', 'Community Talk'],
  // Nav / footer branding
  ['KEYNOTE', 'NODE'],
  ['Keynote', 'NODE'],

  // Introduction section lead text (various cached versions)
  ['Developers, designers, and founders from across Northern Ontario to talk about ', 'Developers from across Northern Ontario building careers in '],

  // About section sub-tagline - "design." is an accent-colored span (separate text node)
  ['to talk about design.', 'building careers in tech.'],
  ['to talk about ', 'building careers in '],
  ['design.', 'tech.'],

  // Speakers / people section
  ["Let the pro's do the talking", 'Board Members'],
  [
    'Learn from indie founders, digital artists, and product designers at the top of their game.',
    'NODE founding board - positions and appointments coming soon.',
  ],
  ['Head of Community Design', 'President'],
  ['Creative Developer', 'Events Coordinator'],
  ['Lead Product Designer', 'Membership Leader'],
  ['Framer Expert & Interface Architect', 'Marketing'],
  ['Indie Maker & Designer of “Plantastic”', ''],

  // Session/talk descriptions
  [
    'A strategy session for solo creatives looking to stand out.',
    'A professional development session for software developers in Northern Ontario.',
  ],
  [
    'Quick-hit, 10-minute talks from community members.',
    'Quick-hit talks from developers, founders, and employers across the region.',
  ],

  // FAQ items
  ['Is this event just for designers?', 'Who can join NODE?'],
  [
    'A look into how artificial intelligence is reshaping creative work.',
    'A look at how the tech ecosystem is evolving in Northern Ontario.',
  ],
  [
    'Hosted by Hana with guests from the indie design scene.',
    'A session on building careers in software in Northern Ontario.',
  ],

  // Sponsors / partners section
  [
    "We\u2019re proud to collaborate with the tools, teams, and brands that empower creatives every day.",
    "We\u2019re grateful to our founding members, sponsors, and community partners who support Northern Ontario\u2019s tech ecosystem.",
  ],

  // Overview / mission section
  [
    'Two days. Dozens of insights. One shared mission: make things that matter.',
    'Hackathons, community meetups, and monthly speaker sessions - built for Northern Ontario devs.',
  ],

  // Vision line
  [
    'Creatives from around the globe, united by a shared love for their craft.',
    "Developers, employers, and government partners working together to grow Northern Ontario\u2019s tech community.",
  ],
  ['Creatives from around the globe', 'Developers from across Northern Ontario'],

  // Buy tickets / CTA buttons
  ['Buy tickets', 'Join NODE'],
  ['Get tickets', 'Join NODE'],

  // Ticket / CTA section
  ['Get a seat for \u20ac99', 'Join NODE - From $60/year'],
  ["We're keeping it intimate and intentional. ", ''],


  // Board Members section - title, subtitle, roles, names
  ['Meet our community', 'Board Members'],
  ['Developers, founders, and designers from across Northern Ontario.', "NODE's founding board shaping the future of tech in Northern Ontario."],
  ['Northern Ontario Developer', 'President'],
  ['UX Designer & Accessibility Advocate', 'Secretary'],
  ['Brand Designer & Creative Director', 'Treasurer'],
  ['Full-Stack Developer & OSS Contributor', 'Marketing'],
  ['CTO & Co-founder', 'Promotion/Sponsorship'],
  ['CTO & co-founder', 'Promotion/Sponsorship'],
  // Board member names (TBD until roles are assigned)
  ['Ava Morales', 'TBD'],
  ['Juniper Walsh', 'TBD'],
  ['Hana Okabe', 'TBD'],
  ['Felix Strom', 'TBD'],
  ['Omar Kalidi', 'TBD'],
  ['Lotte Swaan', 'TBD'],
  ['Elias Mendez', 'TBD'],
  ['Nova Renfield', 'TBD'],
  ['Remy Jacobs', 'TBD'],

  // Additional speaker role not yet replaced
  ['Freelance Brand & Identity Designer', 'Technical Communicator'],

  // Schedule session descriptions (alternate Framer variants)
  ["We’ll kick things off with a quick intro, some creative energy, and a preview of what’s ahead.", 'An introduction to NODE and our community events across Northern Ontario.'],
  ["A look into how artificial intelligence is reshaping creativity, and what it means for human designers.", 'A look at how the tech ecosystem is evolving in Northern Ontario.'],

  // Framer badge residual text (our domain substituted into Framer promo copy)
  ['sudburynode.com, the website builder loved by startups, designers and agencies.', ''],

  // Standalone year in ticket graphic
  ['2024', '2026'],

  // Footer links and Framer badges
  ['View all templates', ''],
  ['Built by Marc', ''],
  ['Made in Framer', 'NODE - Northern Ontario Dev Exchange'],
  ['© NODE', '© NODE - Northern Ontario Dev Exchange'],
  ['© Offscreen', '© NODE - Northern Ontario Dev Exchange'],
  ['© Keynote', '© NODE - Northern Ontario Dev Exchange'],
  ['keynote.framer.website', 'sudburynode.com'],
  ['Get template', ''],
  ['Create a free website with Framer', 'sudburynode.com'],
]

// Char-animated text: Framer splits each character into its own inline-block span.
// We match the full word by concatenating spans, then swap char-by-char.
// Replacement strings must use the same character count as the original.
const CHAR_ANIM_MAPS: [string, string][] = [
  ['01/02.07', 'Est.2026'],  // 8 chars
  ['2026', 'NODE'],           // 4 chars
  ['Amsterdam', 'N.Ontario'], // 9 chars
  ['OFFSCREEN', 'NODE'],      // 9->4 chars, excess hidden via display:none
  ['STUDIO DRAADLOOS', 'SUDBURY, ONTARIO'], // 16->16 chars
  ['2024', '2026'],           // 4->4 chars
]

function fixCharAnimatedText() {
  const allEls = document.querySelectorAll<HTMLElement>('p, div, span')
  for (const el of allEls) {
    const spans = Array.from(el.children) as HTMLElement[]
    if (spans.length < 3) continue
    const allSingleChar = spans.every(
      (s) => s.tagName === 'SPAN' && (s.textContent?.length ?? 0) === 1
    )
    if (!allSingleChar) continue
    const combined = spans.map((s) => s.textContent).join('')
    for (const [from, to] of CHAR_ANIM_MAPS) {
      if (combined === from) {
        for (let i = 0; i < spans.length; i++) {
          if (i < to.length) {
            spans[i].textContent = to[i]
          } else {
            spans[i].style.display = 'none'
          }
        }
        break
      }
    }
  }
}

function fixExactTextNodes() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) nodes.push(node as Text)
  for (const textNode of nodes) {
    if (textNode.nodeValue === 'design') textNode.nodeValue = 'tech'
  }
}


function replaceQRCode() {
  // Replace the referenced SVG symbol used by the ticket <use> element
  const qrSvg = document.getElementById('svg1712395987_1155')
  if (qrSvg && !qrSvg.getAttribute('data-node-replaced')) {
    qrSvg.setAttribute('data-node-replaced', '1')
    while (qrSvg.firstChild) qrSvg.removeChild(qrSvg.firstChild)
  }

  // Also inject a visible QR img into the black ticket stub
  const stub = document.querySelector('.framer-1a1p7qu')
  if (stub && !stub.querySelector('.node-qr-inject')) {
    const img = document.createElement('img')
    img.src = '/nodesudbury-qr.svg'
    img.className = 'node-qr-inject'
    img.style.cssText = 'position:absolute;top:393px;left:50%;transform:translateX(-50%);width:40px;height:40px;border-radius:3px;z-index:10;display:block;'
    stub.style.position = 'relative'
    stub.appendChild(img)
  }
}


function fillFooter() {
  const col1 = document.querySelector('.framer-1ilwqi8')
  if (!col1 || col1.querySelector('.node-footer-fill')) return

  const fill = document.createElement('div')
  fill.className = 'node-footer-fill'
  fill.style.cssText = 'display:flex;flex-direction:row;gap:80px;align-items:flex-start;margin-top:32px;width:100%;'
  fill.innerHTML = [
    '<div style="flex:1;min-width:220px;">',
      '<img src="/node-logo.svg" alt="NODE" style="height:112px;width:auto;margin-bottom:16px;display:block;opacity:0.85;">',
      '<p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;margin:0 0 20px;max-width:260px;">',
        'Career, growth, and connection for developers in Northern Ontario.',
      '</p>',
      '<a href="https://nodesudbury.com" style="color:rgba(255,255,255,0.3);font-size:12px;text-decoration:none;letter-spacing:0.05em;">nodesudbury.com</a>',
    '</div>',
    '<div style="min-width:160px;">',
      '<p style="color:rgba(255,255,255,0.28);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 14px;">Programs</p>',
      '<p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.9;margin:0;">',
        '4 Hackathons / year<br>Monthly Speaker Series<br>Cursor Sudbury + GDG Sudbury Events',
      '</p>',
    '</div>',
    '<div style="min-width:160px;">',
      '<p style="color:rgba(255,255,255,0.28);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 14px;">Membership</p>',
      '<p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.9;margin:0;">',
        '$60 / year<br>$10 for students',
      '</p>',
    '</div>',
    '<div style="min-width:160px;">',
      '<p style="color:rgba(255,255,255,0.28);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 14px;">Contact Us</p>',
      '<p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.9;margin:0;">',
        '<a href="https://maps.app.goo.gl/KRN8KNF9aqA26qiH6" target="_blank" style="color:rgba(255,255,255,0.6);text-decoration:none;">73 Elm St Ste 203<br>Sudbury, ON P3C 1R6</a>',
      '</p>',
    '</div>',
  ].join('')

  col1.appendChild(fill)
}


function patchSocialLinks() {
  document.querySelectorAll('a[href]').forEach(function(el) {
    var href = el.getAttribute('href') || ''
    if (href === 'https://twitter.com/') {
      el.setAttribute('href', 'https://x.com/nodesudbury')
    } else if (href === 'https://www.instagram.com/') {
      el.setAttribute('href', 'https://www.instagram.com/nodesudbury')
    } else if (href === 'https://www.linkedin.com/') {
      el.setAttribute('href', 'https://www.linkedin.com/company/nodesudbury')
    }
  })
}


function hideNinthSpeakerCard() {
  const cards = document.querySelectorAll('.framer-w5m9d8-container')
  if (cards.length >= 9) {
    const ninth = cards[8] as HTMLElement
    ninth.style.setProperty('display', 'none', 'important')
  }
}


function injectNorcatTab() {
  if (document.getElementById('node-norcat-panel')) return

  var toggle = document.querySelector('.framer-1r52h0k')
  if (!toggle) return

  var inactiveTab = toggle.querySelector('.framer-zd3517')
  if (!inactiveTab) return

  var framerIndicator = toggle.querySelector('.framer-sti4qg')
  var framerContentWrapper = toggle.parentElement ? toggle.parentElement.querySelector('.framer-pylpcu') : null
  if (!framerContentWrapper) return

  // Hide Framer's full-width indicator
  if (framerIndicator) framerIndicator.style.display = 'none'

  // Create custom per-tab indicator
  toggle.style.position = 'relative'
  var customIndicator = document.createElement('div')
  customIndicator.id = 'node-tab-indicator'
  customIndicator.style.cssText = 'position:absolute;bottom:0;height:2px;background:white;transition:left 0.25s ease,width 0.25s ease;pointer-events:none;z-index:10'
  toggle.appendChild(customIndicator)

  function moveIndicatorTo(btn) {
    customIndicator.style.left = btn.offsetLeft + 'px'
    customIndicator.style.width = btn.offsetWidth + 'px'
  }

  // Set indicator to current Framer active tab on init
  var initActive = toggle.querySelector('.framer-14jtise')
  if (initActive) moveIndicatorTo(initActive)

  // Clone inactive tab for Norcat button
  var norcatBtn = inactiveTab.cloneNode(true)
  norcatBtn.id = 'node-norcat-btn'
  norcatBtn.removeAttribute('data-highlight')
  norcatBtn.removeAttribute('tabindex')
  var textEl = norcatBtn.querySelector('p')
  if (textEl) textEl.textContent = 'Norcat Series'
  toggle.appendChild(norcatBtn)

  function makeRow(startTime, endTime, title, desc) {
    return '<div class="framer-1s0myzk-container"><div class="framer-llh98 framer-sm0m3 framer-94Yay framer-HwNb8 framer-crZ8S framer-1fcu53n framer-v-1fcu53n">' +
      '<div class="framer-xzn74c">' +
        '<div class="framer-1ftkc15"><p class="framer-text framer-styles-preset-1b55z8">' + startTime + '</p></div>' +
        '<div class="framer-sew18f"><p class="framer-text framer-styles-preset-1u2gnq3">' + endTime + '</p></div>' +
      '</div>' +
      '<div class="framer-1xu6kku"><div class="framer-1moom2e">' +
        '<div class="framer-1wjcs3r"><p class="framer-text framer-styles-preset-hlwjqk">' + title + '</p></div>' +
        '<div class="framer-l68cd"><div class="framer-gv5jpq"><p class="framer-text framer-styles-preset-zv16zk">' + desc + '</p></div></div>' +
      '</div></div>' +
    '</div></div>'
  }

  var events = [
    ['Sep 16, 2026', 'AI Tools for Developers - Using LLMs in Your Workflow', 'Kick off the Norcat Speaker Series with a hands-on look at AI tooling for everyday dev work. Q&A to follow. Open to all.'],
    ['Oct 21, 2026', 'Building a Career in Northern Ontario Tech', 'Panelists share real paths to software careers in Northern Ontario - remote, hybrid, and local. Candid conversation + Q&A.'],
    ['Nov 18, 2026', 'Open Source Contribution Workshop', 'An intro to contributing to open source projects - finding good first issues, submitting PRs, and building a public portfolio.'],
    ['Dec 16, 2026', 'Year in Review - Tech in the North', 'A recap of 2026 in Northern Ontario tech. Lightning talks, community highlights, and a look at what\'s coming in 2027.'],
    ['Jan 20, 2027', 'Remote-First: Working from Northern Ontario', 'How developers in the region are landing and keeping remote roles. Tips on visibility, time zones, and async collaboration.'],
    ['Feb 17, 2027', 'From Side Project to Product', 'Three local builders walk through how they turned a weekend project into something real. Lessons learned the hard way.'],
    ['Mar 17, 2027', 'Accessibility in Modern Web Dev', 'Practical session on building accessible interfaces. WCAG, screen readers, automated testing, and common pitfalls.'],
    ['Apr 21, 2027', 'DevOps for Small Teams', 'CI/CD, infrastructure, and on-call culture scaled to teams of 1-5. What actually matters when you\'re doing it all.'],
    ['May 19, 2027', 'Mobile First: Building for Northern Ontario', 'Design and performance considerations for users on slower connections and older devices across the region.'],
    ['Jun 16, 2027', 'Security Basics Every Developer Should Know', 'Threat modelling, common vulnerabilities, and practical habits that keep your apps and users safe. No jargon.'],
    ['Jul 21, 2027', 'Building with AI APIs', 'Hands-on walkthrough of integrating LLM APIs into real apps - streaming, context, cost, and when not to use AI.'],
    ['Aug 18, 2027', 'Freelancing and Consulting in Tech', 'How to find clients, scope projects, set rates, and manage the business side of being an independent developer.'],
  ]

  var panel = document.createElement('div')
  panel.id = 'node-norcat-panel'
  panel.style.display = 'none'
  panel.innerHTML = events.map(function(e) {
    return makeRow('6:00 PM', '7:00 PM', e[1], e[0] + ' · Norcat Hub, Sudbury · ' + e[2])
  }).join('')
  framerContentWrapper.parentElement.insertBefore(panel, framerContentWrapper.nextSibling)

  // Watch Framer class changes to track which Framer tab is active
  var tabObserver = new MutationObserver(function() {
    if (toggle.getAttribute('data-norcat-active') === 'true') return
    var active = Array.from(toggle.children).find(function(c) {
      return c.className === 'framer-14jtise' && c !== norcatBtn
    })
    if (active) moveIndicatorTo(active)
  })
  tabObserver.observe(toggle, {subtree: true, attributes: true, attributeFilter: ['class']})

  function activateNorcat() {
    toggle.setAttribute('data-norcat-active', 'true')
    // Dim the currently active Framer tab text so only Norcat appears active
    var framerActive = Array.from(toggle.children).find(function(c) {
      return c.className === 'framer-14jtise' && c !== norcatBtn
    })
    if (framerActive) {
      var p = framerActive.querySelector('p')
      if (p) p.style.color = 'rgb(255,255,255)'
    }
    // Dim Norcat text to match active style
    var norcatP = norcatBtn.querySelector('p')
    if (norcatP) norcatP.style.color = 'rgba(255,255,255,0.5)'
    moveIndicatorTo(norcatBtn)
    framerContentWrapper.style.display = 'none'
    panel.style.display = ''
  }

  function deactivateNorcat() {
    toggle.removeAttribute('data-norcat-active')
    Array.from(toggle.querySelectorAll('p')).forEach(function(p) {
      p.style.removeProperty('color')
    })
    framerContentWrapper.style.display = ''
    panel.style.display = 'none'
    // Small delay so Framer's class update settles before we read it
    setTimeout(function() {
      var active = Array.from(toggle.children).find(function(c) {
        return c.className === 'framer-14jtise' && c !== norcatBtn
      })
      if (active) moveIndicatorTo(active)
    }, 50)
  }

  norcatBtn.addEventListener('click', activateNorcat)
  Array.from(toggle.children).forEach(function(btn) {
    if (btn !== norcatBtn && btn !== customIndicator && btn.className !== 'framer-sti4qg') {
      btn.addEventListener('click', deactivateNorcat)
    }
  })
}


function injectCustomSchedule() {
  if (document.getElementById('node-schedule-section')) return
  var hfmmhe = document.querySelector('.framer-hfmmhe')
  if (!hfmmhe) return

  // Hide Framer schedule section (both columns)
  hfmmhe.style.display = 'none'

  function makeRow(start, end, type, subtitle, desc) {
    var timeHtml = '<div style="width:90px;flex-shrink:0;padding-top:4px;">' +
      '<div style="color:white;font-size:20px;font-weight:500;line-height:1.2;">' + start + '</div>' +
      (end ? '<div style="color:rgba(255,255,255,0.4);font-size:14px;margin-top:4px;">' + end + '</div>' : '') +
      '</div>'
    var contentHtml = '<div style="flex:1;">' +
      '<div style="color:white;font-size:28px;font-weight:600;line-height:1.2;margin-bottom:' + (subtitle || desc ? '10px' : '0') + ';">' + type + '</div>' +
      (subtitle ? '<div style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;margin-bottom:6px;">' + subtitle + '</div>' : '') +
      (desc ? '<div style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.65;">' + desc + '</div>' : '') +
      '</div>'
    return '<div style="display:flex;gap:56px;padding:30px 0;border-bottom:1px solid rgba(255,255,255,0.09);align-items:flex-start;">' +
      timeHtml + contentHtml + '</div>'
  }

  function makeBreak(label) {
    return '<div style="background:repeating-linear-gradient(-45deg,rgba(255,255,255,0.025),rgba(255,255,255,0.025) 1px,transparent 1px,transparent 9px);padding:22px 32px;margin:2px 0;color:rgba(255,255,255,0.7);font-size:14px;font-weight:500;">' + label + '</div>'
  }

  var hackathonsHTML =
    makeRow('Fall 2026', 'Date TBD', 'Fall Hackathon', 'Title TBD', 'Details coming soon. Stay tuned for theme and registration.') +
    makeRow('Winter 2027', 'Date TBD', 'Winter Hackathon', 'Title TBD', 'Details coming soon. Stay tuned for theme and registration.') +
    makeRow('Spring 2027', 'Date TBD', 'Spring Hackathon', 'Title TBD', 'Details coming soon. Stay tuned for theme and registration.') +
    makeRow('Summer 2027', 'Date TBD', 'Summer Hackathon', 'Title TBD', 'Details coming soon. Stay tuned for theme and registration.')

  var communityHTML =
    makeRow('Sep 2026', 'Date TBD', 'Cursor Sudbury', 'Title TBD', 'Monthly meetup for Cursor editor users. Details coming soon.') +
    makeRow('Oct 2026', 'Date TBD', 'GDG Sudbury', 'Title TBD', 'Google Developer Group monthly meetup. Details coming soon.') +
    makeRow('Nov 2026', 'Date TBD', 'Cursor Sudbury', 'Title TBD', 'Monthly meetup for Cursor editor users. Details coming soon.') +
    makeRow('Dec 2026', 'Date TBD', 'GDG Sudbury', 'Title TBD', 'Year-end community gathering. Details coming soon.') +
    makeRow('Jan 2027', 'Date TBD', 'Cursor Sudbury', 'Title TBD', 'Monthly meetup for Cursor editor users. Details coming soon.') +
    makeRow('Feb 2027', 'Date TBD', 'GDG Sudbury', 'Title TBD', 'Google Developer Group meetup. Details coming soon.')

  var norcatEvents = [
    ['Sep 2026', 'Session 1', 'Title TBD'],
    ['Oct 2026', 'Session 2', 'Title TBD'],
    ['Nov 2026', 'Session 3', 'Title TBD'],
    ['Dec 2026', 'Session 4', 'Title TBD'],
    ['Jan 2027', 'Session 5', 'Title TBD'],
    ['Feb 2027', 'Session 6', 'Title TBD'],
    ['Mar 2027', 'Session 7', 'Title TBD'],
    ['Apr 2027', 'Session 8', 'Title TBD'],
    ['May 2027', 'Session 9', 'Title TBD'],
    ['Jun 2027', 'Session 10', 'Title TBD'],
    ['Jul 2027', 'Session 11', 'Title TBD'],
    ['Aug 2027', 'Session 12', 'Title TBD']
  ]
  var norcatHTML = norcatEvents.map(function(e) {
    return makeRow(e[0], 'Date TBD', e[1], e[2] + ' - Norcat Hub, Sudbury', 'Details coming soon. Monthly speaker session hosted at Norcat Hub.')
  }).join('')

  var ticketSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>'

  var section = document.createElement('div')
  section.id = 'node-schedule-section'
  section.style.cssText = 'width:100%;background:#000;padding:80px;display:flex;flex-direction:row;align-items:flex-start;gap:80px;box-sizing:border-box;font-family:Inter,system-ui,sans-serif;border-top:1px solid rgba(255,255,255,0.08);'

  section.innerHTML =
    '<div style="width:340px;flex-shrink:0;position:sticky;top:40px;">' +
      '<div style="display:inline-block;background:rgba(120,80,210,0.15);border:1px solid rgba(120,80,210,0.35);border-radius:999px;padding:4px 14px;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:0.02em;margin-bottom:22px;">Events</div>' +
      '<h2 style="font-size:72px;font-weight:700;color:white;margin:0 0 24px;line-height:0.95;letter-spacing:-0.03em;">Schedule</h2>' +
      '<p style="color:rgba(255,255,255,0.5);font-size:16px;line-height:1.65;margin:0 0 40px;max-width:280px;">Hackathons, community meetups, and monthly speaker sessions - built for Northern Ontario devs.</p>' +
      '<a href="https://nodesudbury.com" style="display:inline-flex;align-items:center;gap:10px;border:1.5px solid rgba(255,255,255,0.85);border-radius:999px;padding:12px 22px;color:white;text-decoration:none;font-size:14px;font-weight:500;font-family:Inter,sans-serif;">' +
        ticketSvg + 'Join NODE' +
      '</a>' +
    '</div>' +
    '<div style="flex:1;min-width:0;">' +
      '<div id="ncs-tab-row" style="display:flex;border-bottom:1px solid rgba(255,255,255,0.12);position:relative;margin-bottom:0;">' +
        '<button id="ncs-t0" style="flex:1;padding:16px 0;background:none;border:none;cursor:pointer;color:white;font-family:Inter,sans-serif;font-size:14px;font-weight:500;text-align:center;-webkit-font-smoothing:antialiased;">Hackathons</button>' +
        '<button id="ncs-t1" style="flex:1;padding:16px 0;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;font-size:14px;font-weight:500;text-align:center;-webkit-font-smoothing:antialiased;">Community Events</button>' +
        '<button id="ncs-t2" style="flex:1;padding:16px 0;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.45);font-family:Inter,sans-serif;font-size:14px;font-weight:500;text-align:center;-webkit-font-smoothing:antialiased;">Norcat Series</button>' +
        '<div id="ncs-ind" style="position:absolute;bottom:-1px;height:2px;background:white;transition:left 0.25s ease,width 0.25s ease;pointer-events:none;"></div>' +
      '</div>' +
      '<div id="ncs-p0">' + hackathonsHTML + '</div>' +
      '<div id="ncs-p1" style="display:none">' + communityHTML + '</div>' +
      '<div id="ncs-p2" style="display:none">' + norcatHTML + '</div>' +
    '</div>'

  hfmmhe.parentNode.insertBefore(section, hfmmhe)

  // Wire up tabs
  var tabs = [document.getElementById('ncs-t0'), document.getElementById('ncs-t1'), document.getElementById('ncs-t2')]
  var panels = [document.getElementById('ncs-p0'), document.getElementById('ncs-p1'), document.getElementById('ncs-p2')]
  var ind = document.getElementById('ncs-ind')

  function moveInd(btn) {
    if (ind && btn) {
      ind.style.left = btn.offsetLeft + 'px'
      ind.style.width = btn.offsetWidth + 'px'
    }
  }

  function selectTab(i) {
    tabs.forEach(function(t, j) {
      if (t) t.style.color = j === i ? 'white' : 'rgba(255,255,255,0.45)'
    })
    panels.forEach(function(p, j) {
      if (p) p.style.display = j === i ? '' : 'none'
    })
    if (tabs[i]) moveInd(tabs[i])
  }

  tabs.forEach(function(btn, i) {
    if (btn) btn.addEventListener('click', function() { selectTab(i) })
  })

  // Set initial indicator after layout is complete
  setTimeout(function() {
    moveInd(tabs[0])
  }, 150)
}

function norcatRow(date: string, title: string, location: string): string {
  return [
    '<div style="display:grid;grid-template-columns:100px 1fr 200px;gap:16px;',
    'padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.07);align-items:center;">',
      '<span style="color:rgba(255,255,255,0.4);font-size:13px;font-family:Inter,sans-serif;">' + date + '</span>',
      '<span style="color:rgba(255,255,255,0.85);font-size:14px;font-family:Inter,sans-serif;">' + title + '</span>',
      '<span style="color:rgba(255,255,255,0.35);font-size:12px;font-family:Inter,sans-serif;text-align:right;">' + location + '</span>',
    '</div>',
  ].join('')
}





function patchBottomPill() {
  var pill = document.querySelector('.framer-MCKAi')
  if (!pill || pill.dataset.nodePillPatched) return
  pill.dataset.nodePillPatched = '1'
  function enforce() {
    var walker = document.createTreeWalker(pill, NodeFilter.SHOW_TEXT)
    var node
    while ((node = walker.nextNode())) {
      var v = (node.nodeValue || '').trim()
      if (v === 'NODE HQ' || v.includes('Norcat Innovation Hub') || v === 'Where Northern Ontario builds') {
        if (node.nodeValue !== 'Where Northern Ontario builds') node.nodeValue = 'Where Northern Ontario builds'
      } else if (v === 'Sudbury, Ontario' || v.includes('1545 Maley Dr') || v.includes('Greater Sudbury, ON') || v.includes('Developers, developers') || v.includes('Developers, builders')) {
        if (node.nodeValue !== 'Developers, makers, founders') node.nodeValue = 'Developers, makers, founders'
      }
    }
  }
  enforce()
  var obs = new MutationObserver(enforce)
  obs.observe(pill, { childList: true, subtree: true })
}

function patchPartnerLinks() {
  var links = [
    ['.framer-1yx60u6-container a.framer-kksVQ', 'https://laurentian.ca/research/fielding-innovation-centre/foundry'],
    ['.framer-7s1b8d-container a.framer-kksVQ', 'https://www.norcat.org/'],
    ['.framer-1i1hzjg-container a.framer-kksVQ', 'https://gdg.community.dev/gdg-sudbury/'],
    ['.framer-87xwjb-container a.framer-kksVQ', 'https://cursor.com']
  ]
  links.forEach(function(pair) {
    var a = document.querySelector(pair[0])
    if (a && a.href !== pair[1]) a.href = pair[1]
  })
}

function patchPartnerLogos() {
  function enforce(fig, h, w) {
    fig.style.setProperty('height', h, 'important')
    fig.style.setProperty('min-height', h, 'important')
    fig.style.setProperty('width', w, 'important')
    fig.style.setProperty('max-width', '90%', 'important')
    fig.style.setProperty('margin', 'auto', 'important')
    fig.style.setProperty('overflow', 'visible', 'important')
  }

  function watchFig(fig, h, w) {
    fig.dataset.nodePatchedH = h
    enforce(fig, h, w)
    var busy = false
    var obs = new MutationObserver(function() {
      if (busy) return
      busy = true
      enforce(fig, h, w)
      busy = false
    })
    obs.observe(fig, { attributes: true, attributeFilter: ['style'] })
  }

  var heroFig = document.querySelector('.framer-1yx60u6-container figure.framer-uwsy9')
  if (heroFig && !heroFig.dataset.nodePatchedH) watchFig(heroFig, '350px', '85%')

  var stdSelectors = [
    '.framer-7s1b8d-container figure.framer-uwsy9',
    '.framer-1i1hzjg-container figure.framer-uwsy9',
    '.framer-87xwjb-container figure.framer-uwsy9'
  ]
  stdSelectors.forEach(function(sel) {
    var fig = document.querySelector(sel)
    if (fig && !fig.dataset.nodePatchedH) watchFig(fig, '200px', '85%')
  })
}

function patchTicker() {
  if (document.querySelector('.node-ticker-patched')) return
  var ul = document.querySelector('.framer-1ccbayj ul')
  if (!ul) return
  var items = ul.querySelectorAll('li.ticker-item')
  if (items.length < 2) return
  // Use first text item as style template
  var textTemplate = items[0]
  var sepTemplate = items[1]

  var newItems = [
    '4 hackathons a year',
    'Monthly Norcat speaker sessions',
    'Community meetups with Cursor Sudbury + GDG',
  ]

  newItems.forEach(function(text) {
    var sep = sepTemplate.cloneNode(true)
    var li = textTemplate.cloneNode(true)
    li.textContent = text
    ul.appendChild(sep)
    ul.appendChild(li)
  })

  ul.classList.add('node-ticker-patched')
}

function patchTickerImages() {
  var figureMap = {
    'framer-13g7wql': '/DSC01916.jpeg',
    'framer-mvyf1q':  '/DSC01933.jpeg',
    'framer-1qhqp2r': '/DSC01896.jpeg',
    'framer-1ouc377': '/DSC01800.jpeg',
    'framer-1qmm35q': '/DSC01730.jpeg',
    'framer-p2j6tr':  '/DSC01534.jpeg',
  }
  function enforce() {
    var ticker = document.querySelector('.framer-1ndzdex')
    if (!ticker) return
    for (var cls in figureMap) {
      var local = figureMap[cls]
      ticker.querySelectorAll('figure.' + cls + ' img').forEach(function(img) {
        if (img.getAttribute('src') !== local) img.setAttribute('src', local)
        if (img.getAttribute('srcset')) img.removeAttribute('srcset')
        if (img.getAttribute('loading') !== 'eager') img.setAttribute('loading', 'eager')
      })
    }
  }
  function idleEnforce() {
    if ((window as any).requestIdleCallback) {
      (window as any).requestIdleCallback(enforce, { timeout: 2000 })
    } else {
      setTimeout(enforce, 0)
    }
  }
  idleEnforce()
  var ticker = document.querySelector('.framer-1ndzdex')
  if (ticker) {
    var obs = new MutationObserver(idleEnforce)
    obs.observe(ticker, { childList: true, subtree: true })
    setTimeout(function() { obs.disconnect() }, 10000)
  }
  var ticks = 0
  var interval = setInterval(function() {
    idleEnforce()
    ticks++
    if (ticks >= 8) clearInterval(interval)
  }, 1000)
}

function patchBoardImages() {
  function enforce() {
    document.querySelectorAll('.framer-w5m9d8-container img').forEach(function(img) {
      var src = img.getAttribute('src') || ''
      if (src && src !== '/usercoming.jpg') {
        img.setAttribute('src', '/usercoming.jpg')
        img.setAttribute('srcset', '/usercoming.jpg')
        img.setAttribute('loading', 'eager')
      }
    })
  }
  enforce()
  var obs = new MutationObserver(enforce)
  obs.observe(document.body, { childList: true, subtree: true })
  var ticks = 0
  var interval = setInterval(function() {
    enforce()
    ticks++
    if (ticks >= 30) clearInterval(interval)
  }, 500)
}


function applyOverrides() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) nodes.push(node as Text)

  for (const textNode of nodes) {
    let val = textNode.nodeValue || ''
    let changed = false
    for (const [from, to] of REPLACEMENTS) {
      if (val.includes(from) && (to === '' || !val.includes(to))) {
        val = val.split(from).join(to)
        changed = true
      }
    }
    if (changed) textNode.nodeValue = val
  }

  fixCharAnimatedText()
  fixExactTextNodes()
  replaceQRCode()
  patchTicker()
  patchPartnerLogos()
  patchBottomPill()
  patchTickerImages()
  patchBoardImages()
  patchPartnerLinks()
  fillFooter()
  hideNinthSpeakerCard()
}

export default function NodeTextOverride() {
  useEffect(() => {
    applyOverrides()

    const observer = new MutationObserver(() => applyOverrides())
    observer.observe(document.body, { childList: true, subtree: true })

    // Run for 30s - covers lazy-loaded scroll sections
    const timer = setTimeout(() => observer.disconnect(), 90000)
    setTimeout(patchSocialLinks, 500)
    setTimeout(patchSocialLinks, 1500)
    setTimeout(injectNorcatTab, 700)
    setTimeout(injectNorcatTab, 2000)
    setTimeout(injectCustomSchedule, 600)
    setTimeout(injectCustomSchedule, 1800)
    return () => { observer.disconnect(); clearTimeout(timer) }
  }, [])

  // Fix title being overridden by Framer events script
  useEffect(() => {
    const correctTitle = 'NODE - Northern Ontario Dev Exchange'
    document.title = correctTitle
    const titleObserver = new MutationObserver(() => {
      if (document.title !== correctTitle) document.title = correctTitle
    })
    const titleEl = document.querySelector('title')
    if (titleEl) titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true })
    return () => titleObserver.disconnect()
  }, [])


  // Replace framerusercontent intro-section images with local user images.
  // Uses prototype-level src/srcset interception so Framer never renders the CDN URL.
  useEffect(() => {
    const IMG_MAP: Record<string, string> = {
      'DljMDcrMbUzKh3NAT0kfL4iE9uk': '/images/1.jpg',
      'A1hGhWkYNaPuvqDXZqn8xTguQ':   '/images/2.jpg',
      'vgDFLdiuNn0RhlgEjFknuIF2elM':  '/images/3.jpg',
      'sSf9eVZTMcXk0FAN4AR7hA0yU':    '/images/4.jpg',
      'Pp8IFnWhnWJOJcTr3KQnM16WGU':   '/images/5.jpg',
      '9GhhUZ4HRBcRnJq3lSMan8nU4':    '/images/6.jpg',
      '3QN96Yp2c2nSPQXxjKjDp3Cg0':    '/images/7.jpg',
      '2eZveSOFu8UG7AR4v9p1r17uCM':   '/images/1.jpg',
      'tpRGJrgzfzUXSJIxcsNRxBqAGRc':  '/images/4.jpg',
      'ZmXS5MTzboIQjEATLsbMB2uKYE8': '/images/1.jpg',
      'SDPT0MVHGxaDgBQwMPCECx6oOc': '/images/2.jpg',
      'jm9UmwrHPWrfTyI7s9azKgD4i8': '/images/3.jpg',
      '83WqvpgGOYouepzBZeH4EPByzg': '/images/5.jpg',
      'klKN1SEm2dEsvuUsxSHEctQ218': '/images/6.jpg',
      'dTxNErqEII2A2fKgo9PDIkdXgo': '/images/7.jpg',
    }

    function redirectUrl(val: string): string {
      if (!val || !val.includes('framerusercontent.com/images/')) return val
      for (const [id, local] of Object.entries(IMG_MAP)) {
        if (val.includes(id)) return local
      }
      return val
    }

    // Intercept src + srcset setters at prototype level - fires synchronously before any render
    if (!('_nodePatched' in HTMLImageElement.prototype)) {
      ;(HTMLImageElement.prototype as any)._nodePatched = true

      const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        get: srcDesc.get,
        set(val: string) {
          srcDesc.set!.call(this, redirectUrl(val))
        },
        configurable: true,
      })

      // Block srcset for any of our replaced portrait image IDs (checked on the incoming value)
      const srcsetDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset')!
      const PORTRAIT_IDS = ['DljMDcrMbUzKh3NAT0kfL4iE9uk','A1hGhWkYNaPuvqDXZqn8xTguQ','vgDFLdiuNn0RhlgEjFknuIF2elM','sSf9eVZTMcXk0FAN4AR7hA0yU','Pp8IFnWhnWJOJcTr3KQnM16WGU','9GhhUZ4HRBcRnJq3lSMan8nU4','3QN96Yp2c2nSPQXxjKjDp3Cg0','2eZveSOFu8UG7AR4v9p1r17uCM','tpRGJrgzfzUXSJIxcsNRxBqAGRc','ZmXS5MTzboIQjEATLsbMB2uKYE8','SDPT0MVHGxaDgBQwMPCECx6oOc','jm9UmwrHPWrfTyI7s9azKgD4i8','83WqvpgGOYouepzBZeH4EPByzg','klKN1SEm2dEsvuUsxSHEctQ218','dTxNErqEII2A2fKgo9PDIkdXgo']
      Object.defineProperty(HTMLImageElement.prototype, 'srcset', {
        get: srcsetDesc.get,
        set(val: string) {
          if (val && PORTRAIT_IDS.some(id => val.includes(id))) {
            srcsetDesc.set!.call(this, ''); return
          }
          srcsetDesc.set!.call(this, val)
        },
        configurable: true,
      })
    }

    // Also intercept setAttribute for src/srcset
    const origSetAttr = HTMLElement.prototype.setAttribute
    if (!(origSetAttr as any)._nodePatched) {
      ;(origSetAttr as any)._nodePatched = true
      HTMLElement.prototype.setAttribute = function(name: string, val: string) {
        if (this instanceof HTMLImageElement) {
          if (name === 'src') { origSetAttr.call(this, name, redirectUrl(val)); return }
          if (name === 'srcset') {
            if (val && PORTRAIT_IDS.some(id => val.includes(id))) { origSetAttr.call(this, name, ''); return }
          }
        }
        origSetAttr.call(this, name, val)
      }
    }

    // Sweep existing imgs on mount - remove CDN srcset before setting local src
    const PORTRAIT_IDS_SWEEP = ['DljMDcrMbUzKh3NAT0kfL4iE9uk','A1hGhWkYNaPuvqDXZqn8xTguQ','vgDFLdiuNn0RhlgEjFknuIF2elM','sSf9eVZTMcXk0FAN4AR7hA0yU','Pp8IFnWhnWJOJcTr3KQnM16WGU','9GhhUZ4HRBcRnJq3lSMan8nU4','3QN96Yp2c2nSPQXxjKjDp3Cg0','2eZveSOFu8UG7AR4v9p1r17uCM','tpRGJrgzfzUXSJIxcsNRxBqAGRc','ZmXS5MTzboIQjEATLsbMB2uKYE8','SDPT0MVHGxaDgBQwMPCECx6oOc','jm9UmwrHPWrfTyI7s9azKgD4i8','83WqvpgGOYouepzBZeH4EPByzg','klKN1SEm2dEsvuUsxSHEctQ218','dTxNErqEII2A2fKgo9PDIkdXgo']
    document.querySelectorAll('img').forEach(img => {
      const newSrc = redirectUrl(img.src)
      if (newSrc !== img.src) {
        img.removeAttribute('srcset')
        img.src = newSrc
      } else if (img.srcset && PORTRAIT_IDS_SWEEP.some(id => img.srcset.includes(id))) {
        img.removeAttribute('srcset')
      }
    })

    // MutationObserver as backstop for new imgs
    const obs = new MutationObserver(() => {
      document.querySelectorAll('img').forEach(img => {
        const newSrc = redirectUrl(img.src)
        if (newSrc !== img.src) {
          img.removeAttribute('srcset')
          img.src = newSrc
        } else if (img.srcset && PORTRAIT_IDS_SWEEP.some(id => img.srcset.includes(id))) {
          img.removeAttribute('srcset')
        }
      })
    })
    obs.observe(document.body, { childList: true, subtree: true })
    const t = setTimeout(() => obs.disconnect(), 60000)
    return () => { obs.disconnect(); clearTimeout(t) }
  }, [])

  return null
}
