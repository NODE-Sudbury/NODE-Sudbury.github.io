/** The privacy policy and the terms of use. Plain data, so a page can show them without parsing. */

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  description: string;
  /** When the text last changed. Change it whenever the text does. */
  updated: string;
  sections: LegalSection[];
}

const CONTACT = 'admin@nodesudbury.com';

export const privacy: LegalDocument = {
  title: 'Privacy policy',
  description: 'What the N.O.D.E. website collects, why, who sees it and how to have it removed.',
  updated: 'October 14, 2026',
  sections: [
    {
      heading: 'Who we are',
      paragraphs: [
        'N.O.D.E. (Northern Ontario Dev Exchange) is a community of developers in Greater Sudbury, Ontario, Canada. This policy covers nodesudbury.com. For questions or requests, write to ' +
          CONTACT +
          '.',
      ],
    },
    {
      heading: 'What you can do without an account',
      paragraphs: [
        'You can read every public page without giving us anything. We do not use advertising, tracking cookies or third-party analytics.',
        'To count which pages are read, we store only the address of the page and how many times it was opened each day. Nothing in that count says who opened it.',
      ],
    },
    {
      heading: 'What we keep when you sign in',
      paragraphs: [
        'You can sign in with Google or with an email link. We then keep your email address, your name and your photo (from Google, or the one you upload).',
        'You can add more to your profile: a handle, a bio, your role or school, your pronouns and links to your LinkedIn, GitHub, X or website.',
      ],
      items: [
        'Your email address is never shown on a page.',
        'You choose whether your profile is public. A public profile is at nodesudbury.com/members/your-handle and shows the details you added, without your email.',
        'You can change or remove any detail, make your profile private, or ask us to delete your account.',
      ],
    },
    {
      heading: 'The updates list',
      paragraphs: [
        'If you subscribe on the home page, we keep your email address to send you news about N.O.D.E. Every message and the page nodesudbury.com/unsubscribe let you take it off the list at any time.',
      ],
    },
    {
      heading: 'What we keep to protect the site',
      items: [
        'To stop abuse, we count requests from an internet address for a short time. These counts are deleted after two days.',
        'When an organizer changes something on the site, such as a partner or a board card, we record who changed what and when. This activity log is seen only by the site owner.',
      ],
    },
    {
      heading: 'Who else is involved',
      paragraphs: [
        'We use these services to run the site. They handle your data only to provide their service.',
      ],
      items: [
        'Supabase stores accounts and profiles, and sends the sign-in emails.',
        'Google handles the sign-in if you choose "Sign in with Google". We receive your name, email and photo.',
        'Vercel hosts the website.',
        'Discord: the home page asks Discord for the number of members of our server, so Discord can see your internet address when the page loads.',
        'YouTube and Luma, if you open a video or an event that is shown on a page.',
      ],
    },
    {
      heading: 'Your choices',
      paragraphs: [
        'You may ask to see, correct or delete what we hold about you, or to withdraw your consent, by writing to ' +
          CONTACT +
          '. We answer within 30 days. We follow the Personal Information Protection and Electronic Documents Act (PIPEDA) of Canada.',
        'We keep your account until you ask us to delete it. When we delete it, your profile and your details are removed. Backups are replaced within a few weeks.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: [
        'The site is not meant for children under 13, and we do not knowingly keep their details.',
      ],
    },
    {
      heading: 'Changes',
      paragraphs: [
        'When we change this policy, we change the date at the top. If the change is large, we also tell members.',
      ],
    },
  ],
};

export const terms: LegalDocument = {
  title: 'Terms of use',
  description: 'The rules for using the N.O.D.E. website and its member accounts.',
  updated: 'October 14, 2026',
  sections: [
    {
      heading: 'Using the site',
      paragraphs: [
        'By using nodesudbury.com you agree to these terms. If you do not agree, please do not use the site. N.O.D.E. is run by volunteers, and the site is offered as it is, without promises that it will always work or be free of mistakes.',
      ],
    },
    {
      heading: 'Your account',
      items: [
        'Give true details, and keep your sign-in secure. You are responsible for what happens under your account.',
        'Choose what you want public. Do not put in your profile anything you do not want others to see.',
        'You can delete your account at any time by writing to ' + CONTACT + '.',
      ],
    },
    {
      heading: 'How we expect you to behave',
      paragraphs: [
        'Our Code of Conduct at nodesudbury.com/coc applies on this site and at N.O.D.E. events and spaces. We may hide a profile or close an account that breaks it.',
      ],
      items: [
        'Do not harass, threaten or impersonate anyone.',
        "Do not post unlawful, hateful or misleading content, or other people's private information.",
        'Do not try to break, overload, scrape or get around the security of the site.',
      ],
    },
    {
      heading: 'Your content',
      paragraphs: [
        'You keep the rights to what you add to your profile. You allow us to show it on the site as you chose, for as long as you keep it there.',
      ],
    },
    {
      heading: 'Our content and open source',
      paragraphs: [
        'The N.O.D.E. name, logo and the text of the site belong to N.O.D.E. The code of the site is open source on GitHub (github.com/NODE-Sudbury), under the license shown there.',
      ],
    },
    {
      heading: 'Limits',
      paragraphs: [
        'To the fullest extent the law of Ontario, Canada allows, N.O.D.E. and its volunteers are not liable for losses from using the site. Nothing here limits rights that cannot be limited by law.',
      ],
    },
    {
      heading: 'Changes and contact',
      paragraphs: [
        'We may change these terms, and we change the date at the top when we do. Using the site after that means you accept the new terms. Questions: ' +
          CONTACT +
          '. These terms follow the laws of Ontario, Canada.',
      ],
    },
  ],
};
