export interface ProfileLink {
  label: string;
  href: string | null;
  value: string;
}

export interface Profile {
  name: string;
  displayName: string;
  headline: string;
  shortBio: string;
  location: string | null;
  email: string | null;
  github: string;
  googleScholar: string | null;
  orcid: string | null;
  linkedin: string | null;
  technicalInterests: string[];
}

export const profile: Profile = {
  name: 'Sam X. Lin',
  displayName: 'SAM X. LIN',
  headline: 'Power Electronics Engineer & Researcher',
  shortBio:
    'Exploring high-frequency power conversion, magnetic structures, switching behavior, and digital control through first-principles engineering.',
  location: null,
  email: null,
  github: 'https://github.com/Samxlin',
  googleScholar: null,
  orcid: null,
  linkedin: null,
  technicalInterests: [
    'High-Frequency Power Conversion',
    'Power Magnetics',
    'Digital Power & Control',
    'Wireless Power',
  ],
};

export const profileLinks: ProfileLink[] = [
  {
    label: 'Email',
    href: profile.email ? `mailto:${profile.email}` : null,
    value: profile.email ?? 'Address to be added',
  },
  {
    label: 'GitHub',
    href: profile.github,
    value: '@Samxlin',
  },
  {
    label: 'Google Scholar',
    href: profile.googleScholar,
    value: 'Profile to be added',
  },
  {
    label: 'ORCID',
    href: profile.orcid,
    value: 'Identifier to be added',
  },
  {
    label: 'LinkedIn',
    href: profile.linkedin,
    value: 'Profile to be added',
  },
];
